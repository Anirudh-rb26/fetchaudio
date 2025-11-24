/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";
import fs from "fs/promises";
import { WaveFile } from "wavefile";
import {
  AutoProcessor,
  AutoTokenizer,
  ClapAudioModelWithProjection,
  ClapTextModelWithProjection,
} from "@xenova/transformers";
import { AudioFile, ConfusionMatrixData, EmbeddingPoint, EvalMetric } from "../types/type";

const MODEL_MAP: Record<string, string> = {
  "laion/clap-htsat-unfused": "Xenova/clap-htsat-unfused",
  "laion/larger_clap_general": "Xenova/larger_clap_general",
  "laion/larger_clap_music": "Xenova/larger_clap_music_and_speech",
};

// Cache directory for embeddings
const CACHE_DIR = path.join(process.cwd(), ".embeddings-cache");

interface CachedEmbeddings {
  modelName: string;
  audioEmbeddings: Array<{
    fileName: string;
    embedding: number[];
    groundTruthLabel: string;
  }>;
  textEmbeddings: {
    [query: string]: number[];
  };
  timestamp: number;
}

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.warn("Could not create cache directory:", error);
  }
}

// Get cache file path for a model
function getCacheFilePath(modelName: string): string {
  const safeName = modelName.replace(/\//g, "_");
  return path.join(CACHE_DIR, `${safeName}.json`);
}

// Load cached embeddings
async function loadCachedEmbeddings(modelName: string): Promise<CachedEmbeddings | null> {
  try {
    const cacheFile = getCacheFilePath(modelName);
    const data = await fs.readFile(cacheFile, "utf-8");
    const cached: CachedEmbeddings = JSON.parse(data);

    console.log(`\n💾 Found cached embeddings for ${modelName}`);
    console.log(`   - Audio embeddings: ${cached.audioEmbeddings.length}`);
    console.log(`   - Text queries: ${Object.keys(cached.textEmbeddings).length}`);
    console.log(`   - Cached on: ${new Date(cached.timestamp).toLocaleString()}`);

    return cached;
  } catch (error) {
    console.log(`\n📭 No cache found for ${modelName}, will generate fresh embeddings`);
    return null;
  }
}

// Save embeddings to cache
async function saveCachedEmbeddings(
  modelName: string,
  audioEmbeddings: Array<{ fileName: string; embedding: number[]; groundTruthLabel: string }>,
  textEmbeddings: { [query: string]: number[] }
) {
  try {
    await ensureCacheDir();
    const cacheFile = getCacheFilePath(modelName);

    const data: CachedEmbeddings = {
      modelName,
      audioEmbeddings,
      textEmbeddings,
      timestamp: Date.now(),
    };

    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
    console.log(`\n💾 Saved embeddings to cache: ${cacheFile}`);
    console.log(`   - Audio embeddings: ${audioEmbeddings.length}`);
    console.log(`   - Text queries: ${Object.keys(textEmbeddings).length}`);
  } catch (error) {
    console.warn("Could not save embeddings to cache:", error);
  }
}

function pcaReduce(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  const d = embeddings[0].length;

  // Center Data
  const mean = new Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += embeddings[i][j];
    }
  }

  mean.forEach((_, i) => (mean[i] /= n));

  const centered = embeddings.map((row) => row.map((val, i) => val - mean[i]));

  return centered.map((row) => [row[0], row[1]]);
}

function calculateMetrics(
  predictions: string[],
  groundTruth: string[]
): { confusionMatrixData: ConfusionMatrixData; evalMetrics: EvalMetric[] } {
  const classes = [...new Set([...predictions, ...groundTruth])].sort();

  const matrix: Record<string, Record<string, number>> = {};

  classes.forEach((cls) => {
    matrix[cls] = {};
    classes.forEach((c) => (matrix[cls][c] = 0));
  });

  predictions.forEach((pred, i) => {
    matrix[groundTruth[i]][pred]++;
  });

  const confusionMatrixData: ConfusionMatrixData = classes.map((actualClass) => {
    const row: any = { actual: actualClass };

    classes.forEach((predictedClass) => {
      row[predictedClass.toLowerCase()] = matrix[actualClass][predictedClass];
    });

    return row;
  });

  let totalTP = 0,
    totalFP = 0,
    totalFN = 0;

  classes.forEach((cls) => {
    const tp = matrix[cls][cls];
    const fn = Object.keys(matrix[cls]).reduce(
      (sum, k) => (k !== cls ? sum + matrix[cls][k] : sum),
      0
    );
    const fp = classes.reduce((sum, c) => (c !== cls ? sum + matrix[c][cls] : sum), 0); // Actually other, predicted cls

    totalTP += tp;
    totalFP += fp;
    totalFN += fn;
  });

  const totalSamples = groundTruth.length;

  const precision = totalTP / (totalTP + totalFP);
  const recall = totalTP / (totalTP + totalFN);
  const f1Score = (2 * (precision * recall)) / (precision + recall);
  const accuracy = totalTP / totalSamples;

  const evalMetrics: EvalMetric[] = [
    { label: "Accuracy", value: parseFloat(accuracy.toFixed(2)) },
    { label: "Precision", value: parseFloat(precision.toFixed(2)) },
    { label: "Recall", value: parseFloat(recall.toFixed(2)) },
    { label: "F1-Score", value: parseFloat(f1Score.toFixed(2)) },
  ];

  return { confusionMatrixData, evalMetrics };
}

function extractClass(filename: string): string {
  const lower = filename.toLowerCase();

  // 1. DRUMS - Check for drum-specific keywords
  const drumPatterns = [
    "drum",
    "_dr_",
    "kick",
    "snare",
    "hihat",
    "hi-hat",
    "cymbal",
    "tom",
    "rim",
    "bash",
    "percussion",
  ];
  if (drumPatterns.some((keyword) => lower.includes(keyword))) {
    return "drums";
  }

  // 2. GUITAR - Check for guitar-specific keywords
  const guitarPatterns = [
    "guitar",
    "gtr",
    "_gt_",
    "strum",
    "riff",
    "pluck",
    "fret",
    "pickslide",
    "electric_guitar",
  ];
  if (guitarPatterns.some((keyword) => lower.includes(keyword))) {
    return "guitar";
  }

  const keysPatterns = ["piano", "key", "keys", "synth", "pad", "organ", "keyboard"];
  if (keysPatterns.some((keyword) => lower.includes(keyword))) {
    return "keys";
  }

  if (lower.startsWith("rock_") && !lower.includes("guitar") && !lower.includes("drum")) {
    console.log(`   ℹ️  Inferring "${filename}" as KEYS (Rock chord progression)`);
    return "keys";
  }

  if (
    lower.includes("chord") ||
    lower.includes("intro") ||
    lower.includes("ballad") ||
    (lower.includes("rhythm") && !lower.includes("guitar"))
  ) {
    console.log(`   ℹ️  Inferring "${filename}" as KEYS (chord/progression file)`);
    return "keys";
  }

  console.warn(`⚠️  Could not classify file: ${filename} - defaulting to 'unknown'`);
  return "unknown";
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

function getArrayStats(arr: Float32Array | Float64Array) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  return { min, max };
}

export async function createEmbedding(
  audioFiles: AudioFile[],
  currentModel: string,
  useCache: boolean = true
) {
  const selectedModel = MODEL_MAP[currentModel];
  console.log("selectedModel (audio-embedding-pipeline): ", selectedModel);

  if (!selectedModel) {
    throw new Error(
      `Model ${currentModel} not supported. Available: ${Object.keys(MODEL_MAP).join(", ")}`
    );
  }

  // Try to load from cache first
  const cached = useCache ? await loadCachedEmbeddings(currentModel) : null;

  let embeddings: number[][] = [];
  const groundTruthLabels: string[] = [];
  const queries = ["drums", "keys", "guitar"];
  let textEmbeddings: number[][] = [];

  if (cached) {
    // Use cached embeddings
    console.log("✅ Using cached embeddings");

    // Match audio files to cached embeddings
    embeddings = audioFiles.map((file) => {
      const cachedEntry = cached.audioEmbeddings.find((e) => e.fileName === file.name);
      if (!cachedEntry) {
        throw new Error(`Cached embedding not found for ${file.name}. Please regenerate cache.`);
      }
      groundTruthLabels.push(cachedEntry.groundTruthLabel);
      return cachedEntry.embedding;
    });

    // Load text embeddings
    textEmbeddings = queries.map((query) => {
      if (!cached.textEmbeddings[query]) {
        throw new Error(`Cached text embedding not found for "${query}". Please regenerate cache.`);
      }
      return cached.textEmbeddings[query];
    });

    console.log(`✅ Loaded ${embeddings.length} audio embeddings from cache`);
    console.log(`✅ Loaded ${textEmbeddings.length} text embeddings from cache`);
  } else {
    // Generate fresh embeddings
    console.log("🧠: Loading Models and Processor");
    const processor = await AutoProcessor.from_pretrained(selectedModel);
    const audioModel = await ClapAudioModelWithProjection.from_pretrained(selectedModel);
    const textModel = await ClapTextModelWithProjection.from_pretrained(selectedModel);
    const tokenizer = await AutoTokenizer.from_pretrained(selectedModel);

    const audioEmbeddingsForCache: Array<{
      fileName: string;
      embedding: number[];
      groundTruthLabel: string;
    }> = [];

    for (const audioFile of audioFiles) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🎵 Processing: ${audioFile.name}`);
      console.log(`${"=".repeat(60)}`);

      const decodedLocation = decodeURIComponent(audioFile.location);
      const audioPath = path.join(process.cwd(), "public", decodedLocation);
      console.log(`📂 File Path: ${audioPath}`);

      try {
        const buffer = await fs.readFile(audioPath);
        console.log(`✅ File loaded successfully`);
        console.log(
          `📊 Buffer size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`
        );

        const wav = new WaveFile();
        console.log(`🔧 WaveFile instance created`);

        wav.fromBuffer(buffer);
        console.log(`✅ Buffer loaded into WaveFile`);

        console.log(`\n📋 Original WAV Properties:`);

        console.log(`\n🔄 Converting to 32-bit float...`);
        wav.toBitDepth("32f");
        console.log(`✅ Converted to 32-bit float`);

        console.log(`\n🔄 Resampling to 48000 Hz...`);
        wav.toSampleRate(48000);

        const audioData: Float64Array | Float64Array[] = wav.getSamples();
        console.log(`\n📊 Audio Data Retrieved:`);

        let processedAudio: Float32Array;

        if (Array.isArray(audioData)) {
          console.log(`   - Type: Multi-channel array`);
          console.log(`   - Number of channels: ${audioData.length}`);
          console.log(`   - Samples per channel: ${audioData[0].length}`);
          console.log(`   - Data type: ${audioData[0].constructor.name}`);

          const stats = getArrayStats(audioData[0]);
          console.log(`   - Sample range: [${stats.min.toFixed(6)}, ${stats.max.toFixed(6)}]`);

          if (audioData.length > 1) {
            console.log(`\n🔀 Converting stereo to mono...`);
            const SCALING_FACTOR = Math.sqrt(2);
            console.log(`   - Scaling factor: ${SCALING_FACTOR.toFixed(6)}`);

            const monoData = new Float32Array(audioData[0].length);
            for (let i = 0; i < audioData[0].length; i++) {
              monoData[i] = (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
            }
            processedAudio = monoData;
            console.log(`✅ Merged ${audioData.length} channels to mono (Float32Array)`);
          } else {
            processedAudio = new Float32Array(audioData[0]);
            console.log(`✅ Converted single channel to Float32Array`);
          }

          console.log(`   - Final mono channel samples: ${processedAudio.length}`);
        } else {
          console.log(`   - Type: Single channel`);
          console.log(`   - Samples: ${audioData.length}`);
          console.log(`   - Data type: ${audioData.constructor.name}`);

          console.log(`   - Converting ${audioData.constructor.name} to Float32Array...`);
          processedAudio = new Float32Array(audioData);

          const stats = getArrayStats(processedAudio);
          console.log(`   - Sample range: [${stats.min.toFixed(6)}, ${stats.max.toFixed(6)}]`);
        }

        if (!processedAudio || processedAudio.length === 0) {
          throw new Error("Audio data is empty after processing");
        }

        console.log(`\n🔍 Final Audio Data for Processor:`);
        console.log(`   - Length: ${processedAudio.length} samples`);
        console.log(`   - Duration: ${(processedAudio.length / 48000).toFixed(2)} seconds`);
        console.log(`   - Type: ${processedAudio.constructor.name}`);
        const preview = new Array(Math.min(5, processedAudio.length));
        for (let i = 0; i < preview.length; i++) {
          preview[i] = processedAudio[i].toFixed(6);
        }
        console.log(`   - First ${preview.length} samples: [${preview.join(", ")}]`);

        console.log(`\n⚙️  Processing with CLAP processor...`);
        const audioInputs = await processor(processedAudio);
        console.log(`✅ CLAP processor completed`);
        console.log(`   - Input features shape: ${audioInputs.input_features?.dims || "N/A"}`);

        console.log(`\n🧠 Generating Embedding for ${audioFile.name}`);
        const { audio_embeds } = await audioModel(audioInputs);
        console.log(`✅ Embedding generated`);
        console.log(`   - Embedding shape: ${audio_embeds.dims}`);
        console.log(`   - Embedding size: ${audio_embeds.data.length}`);

        const embeddingArray = new Array(audio_embeds.data.length);
        for (let i = 0; i < audio_embeds.data.length; i++) {
          embeddingArray[i] = audio_embeds.data[i];
        }

        const embedStats = getArrayStats(audio_embeds.data);
        console.log(
          `   - Embedding range: [${embedStats.min.toFixed(6)}, ${embedStats.max.toFixed(6)}]`
        );

        const label = extractClass(audioFile.name);
        embeddings.push(embeddingArray);
        groundTruthLabels.push(label);
        console.log(`   - Ground truth label: ${label}`);

        // Store for caching
        audioEmbeddingsForCache.push({
          fileName: audioFile.name,
          embedding: embeddingArray,
          groundTruthLabel: label,
        });
      } catch (error: any) {
        console.error(`\n❌ Error processing ${audioFile.name}:`);
        console.error(`   - Error type: ${error.constructor?.name || "Unknown"}`);
        console.error(`   - Error message: ${error.message}`);
        console.error(`   - Stack trace:`, error.stack);
        throw error;
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 All Audio Files Processed Successfully`);
    console.log(`   - Total files: ${audioFiles.length}`);
    console.log(`   - Total embeddings: ${embeddings.length}`);
    console.log(`${"=".repeat(60)}\n`);

    // Generate text embeddings
    console.log("🧮: Generating Text Embeddings for Queries");
    const textEmbeddingsMap: { [query: string]: number[] } = {};

    for (const query of queries) {
      console.log(`   - Processing query: "${query}"`);

      try {
        const text_inputs = tokenizer([query], { padding: true, truncation: true });
        const { text_embeds } = await textModel(text_inputs);

        const textEmbedArray = new Array(text_embeds.data.length);
        for (let i = 0; i < text_embeds.data.length; i++) {
          textEmbedArray[i] = text_embeds.data[i];
        }
        textEmbeddings.push(textEmbedArray);
        textEmbeddingsMap[query] = textEmbedArray;
        console.log(`     ✅ Embedding generated (size: ${text_embeds.data.length})`);
      } catch (error: any) {
        console.error(`     ❌ Error processing query "${query}":`, error.message);
        throw error;
      }
    }

    // Save to cache
    if (useCache) {
      await saveCachedEmbeddings(currentModel, audioEmbeddingsForCache, textEmbeddingsMap);
    }
  }

  // Filter out "unknown" samples
  const unknownCount = groundTruthLabels.filter((l) => l === "unknown").length;
  if (unknownCount > 0) {
    console.warn(`\n⚠️  WARNING: Found ${unknownCount} files with 'unknown' labels!`);
    console.warn(`   These will be EXCLUDED from evaluation metrics.`);
    console.warn(`   Please ensure your files have proper names containing:`);
    console.warn(`   - 'drum', 'kick', 'snare', etc. for drums`);
    console.warn(`   - 'key', 'piano', 'synth', etc. for keys`);
    console.warn(`   - 'guitar', 'bass', 'strum', etc. for guitar\n`);
  }

  // Filter indices where label is not "unknown"
  const validIndices = groundTruthLabels
    .map((label, idx) => (label !== "unknown" ? idx : -1))
    .filter((idx) => idx !== -1);

  const filteredEmbeddings = validIndices.map((idx) => embeddings[idx]);
  const filteredLabels = validIndices.map((idx) => groundTruthLabels[idx]);
  const filteredFiles = validIndices.map((idx) => audioFiles[idx]);

  console.log(`\n📊 Dataset Statistics:`);
  console.log(`   - Total files: ${audioFiles.length}`);
  console.log(`   - Valid files: ${filteredFiles.length}`);
  console.log(`   - Excluded (unknown): ${unknownCount}`);

  const labelCounts: Record<string, number> = {};
  filteredLabels.forEach((label) => {
    labelCounts[label] = (labelCounts[label] || 0) + 1;
  });
  console.log(`\n   Label distribution:`);
  Object.entries(labelCounts)
    .sort()
    .forEach(([label, count]) => {
      console.log(`     - ${label}: ${count}`);
    });

  const reduced = pcaReduce(filteredEmbeddings);
  console.log(`🗺️  PCA reduction completed: ${filteredEmbeddings[0].length}D → 2D`);

  console.log("\n🗺️: Preparing Embedding Points for Visualization");
  const embeddingPoints: EmbeddingPoint[] = filteredFiles.map((file, i) => ({
    id: file.id,
    x: reduced[i][0],
    y: reduced[i][1],
    label: file.name,
    audioSample: file.location,
  }));

  console.log("\n🔢: Running Predictions!");
  const predictions = filteredEmbeddings.map((audioEmbed, idx) => {
    const similarities = textEmbeddings.map((textEmbed) => cosineSimilarity(audioEmbed, textEmbed));
    const maxIndex = similarities.indexOf(Math.max(...similarities));
    console.log(
      `   - ${filteredFiles[idx].name}: Predicted="${
        queries[maxIndex]
      }", Similarities=[${similarities.map((s) => s.toFixed(3)).join(", ")}]`
    );
    return queries[maxIndex];
  });

  const { confusionMatrixData, evalMetrics } = calculateMetrics(predictions, filteredLabels);

  console.log(`\n📈 Evaluation Metrics (excluding unknown samples):`);
  evalMetrics.forEach((metric) => {
    console.log(`   - ${metric.label}: ${metric.value}`);
  });

  console.log(`\n📊 Confusion Matrix (Rows=Actual, Columns=Predicted):`);
  confusionMatrixData.forEach((row: any) => {
    const actual = row.actual;
    delete row.actual;
    console.log(`   ${actual}: ${JSON.stringify(row)}`);
  });

  return {
    embeddingPoints,
    confusionMatrixData,
    evalMetrics,
  };
}
