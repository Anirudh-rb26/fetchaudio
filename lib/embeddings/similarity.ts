import path from "path";
import fs from "fs/promises";
import { AudioFile } from "../types/type";
import { AutoTokenizer, ClapTextModelWithProjection } from "@xenova/transformers";

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
    return cached;
  } catch (error) {
    console.error(`❌ No cache found for ${modelName}. Please run createEmbedding first.`);
    return null;
  }
}

// Cosine similarity calculation
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

/**
 * Performs semantic search on audio files using text prompts
 * @param prompt - Natural language search query (e.g., "I need a drum sample")
 * @param currentModel - CLAP model to use (default: "laion/larger_clap_music")
 * @param topK - Number of results to return (default: 5)
 * @param audioFiles - Optional array of audio files with metadata. If provided, only these files will be searched
 * @returns Array of matching audio files with similarity scores
 */
export async function cosineSearch(
  prompt: string,
  currentModel: string = "laion/larger_clap_music",
  topK: number = 5,
  audioFiles?: AudioFile[]
): Promise<
  Array<{
    audioFile: AudioFile;
    similarity: number;
    label: string;
  }>
> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔍 Semantic Search: "${prompt}"`);
  console.log(`${"=".repeat(60)}`);

  const selectedModel = MODEL_MAP[currentModel];
  if (!selectedModel) {
    throw new Error(
      `Model ${currentModel} not supported. Available: ${Object.keys(MODEL_MAP).join(", ")}`
    );
  }

  // Load cached embeddings
  console.log(`📂 Loading cached embeddings for ${currentModel}...`);
  const cached = await loadCachedEmbeddings(currentModel);
  if (!cached) {
    throw new Error(
      "No cached embeddings found. Please run createEmbedding() first to generate embeddings."
    );
  }

  console.log(`✅ Loaded ${cached.audioEmbeddings.length} cached audio embeddings`);

  // Generate embedding for search prompt
  console.log(`\n🧠 Generating text embedding for query...`);
  const tokenizer = await AutoTokenizer.from_pretrained(selectedModel);
  const textModel = await ClapTextModelWithProjection.from_pretrained(selectedModel);

  const text_inputs = tokenizer([prompt], { padding: true, truncation: true });
  const { text_embeds } = await textModel(text_inputs);

  const queryEmbedding = Array.from<number>(text_embeds.data);
  console.log(`✅ Query embedding generated (dimension: ${queryEmbedding.length})`);

  // Calculate similarities with all cached audio embeddings
  console.log(`\n📊 Calculating cosine similarities...`);
  const results = cached.audioEmbeddings
    .map((audio) => ({
      fileName: audio.fileName,
      embedding: audio.embedding,
      label: audio.groundTruthLabel,
      similarity: cosineSimilarity(queryEmbedding, audio.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  console.log(`\n✨ Top ${topK} Results:`);
  results.forEach((result, idx) => {
    console.log(
      `   ${idx + 1}. ${result.fileName} (${
        result.label
      }) - Similarity: ${result.similarity.toFixed(4)}`
    );
  });

  // If audioFiles array is provided, construct full AudioFile objects
  if (audioFiles) {
    const audioFileMap = new Map(audioFiles.map((file) => [file.name, file]));

    const matchedResults = results
      .map((result) => {
        const audioFile = audioFileMap.get(result.fileName);
        if (!audioFile) {
          console.warn(`⚠️  Audio file not found in provided list: ${result.fileName}`);
          return null;
        }
        return {
          audioFile,
          similarity: result.similarity,
          label: result.label,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    console.log(`\n📦 Returning ${matchedResults.length} matched audio files`);
    console.log(`${"=".repeat(60)}\n`);

    return matchedResults;
  }

  // If no audioFiles provided, construct minimal AudioFile objects from cache
  const minimalResults = results.map((result) => ({
    audioFile: {
      id: result.fileName,
      name: result.fileName,
      location: "", // Location not available from cache
      duration: undefined,
    },
    similarity: result.similarity,
    label: result.label,
  }));

  console.log(`\n📦 Returning ${minimalResults.length} results (without full metadata)`);
  console.log(`   💡 Tip: Pass audioFiles array to get complete file metadata`);
  console.log(`${"=".repeat(60)}\n`);

  return minimalResults;
}
