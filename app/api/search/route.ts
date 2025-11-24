/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getStoredEmbeddings,
  MODEL_NAMES,
  ModelKey,
} from "@/lib/embeddings/audio-embedding-pipeline.ts";
import { findTopK } from "@/lib/embeddings/similarity";
import { AutoTokenizer, ClapTextModelWithProjection } from "@huggingface/transformers";
import { NextRequest, NextResponse } from "next/server";

// Cache for text models (reuse from embedding pipeline)
const textModelCache: Map<string, { tokenizer: any; textModel: any }> = new Map();

async function initializeTextModel(modelName: string) {
  if (textModelCache.has(modelName)) {
    return textModelCache.get(modelName)!;
  }

  const tokenizer = await AutoTokenizer.from_pretrained(modelName);
  const textModel = await ClapTextModelWithProjection.from_pretrained(modelName, { dtype: "q8" });

  const instance = { tokenizer, textModel };
  textModelCache.set(modelName, instance);
  return instance;
}

/**
 * Search API - finds audio samples similar to text query
 */
export async function POST(request: NextRequest) {
  try {
    const { query, currentModel, topK = 5 } = await request.json();

    // Validation
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required and must be a string" },
        { status: 400 }
      );
    }

    if (!currentModel) {
      return NextResponse.json({ error: "currentModel is required" }, { status: 400 });
    }

    const modelName = MODEL_NAMES[currentModel as ModelKey] || currentModel;

    // Check if embeddings exist for this model
    const storedEmbeddings = getStoredEmbeddings(modelName);
    if (!storedEmbeddings || storedEmbeddings.size === 0) {
      return NextResponse.json(
        {
          error: "No embeddings found for this model. Please run embedding first.",
          results: [],
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching for: "${query}" using ${modelName}`);

    // Generate text embedding for query
    const { tokenizer, textModel } = await initializeTextModel(modelName);
    const textInputs = tokenizer([query], { padding: true, truncation: true });
    const { text_embeds } = await textModel(textInputs);
    const queryEmbedding = text_embeds.data as Float32Array;

    // Normalize query embedding
    const norm = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedQuery = queryEmbedding.map((val) => val / norm) as Float32Array;

    // Convert stored embeddings to candidate format
    const candidates = Array.from(storedEmbeddings.entries()).map(([id, embedding]) => ({
      id,
      embedding,
      metadata: { id },
    }));

    // Find top-k similar audio samples
    const topResults = findTopK(normalizedQuery, candidates, topK);

    // Check if any results found
    if (topResults.length === 0 || topResults[0].similarity < 0.1) {
      return NextResponse.json({
        message: "no audio",
        query,
        model: currentModel,
        results: [],
      });
    }

    // Format results
    const results = topResults.map((result) => ({
      audioFileId: result.id,
      similarity: result.similarity,
      // Note: You'll need to map ID back to audioFile name/location
      // This requires storing the mapping in the embedding pipeline
    }));

    console.log(`✅ Found ${results.length} results`);

    return NextResponse.json({
      query,
      model: currentModel,
      results,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Use POST with query and currentModel in body" },
    { status: 405 }
  );
}
