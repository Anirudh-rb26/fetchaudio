import { NextRequest, NextResponse } from "next/server";
import { createEmbedding } from "@/lib/embeddings/audio-embedding-pipeline.ts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentModel, audioFiles } = body;

    // Validation
    if (!currentModel || typeof currentModel !== "string") {
      return NextResponse.json(
        { error: "currentModel is required and must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(audioFiles)) {
      return NextResponse.json({ error: "audioFiles must be an array" }, { status: 400 });
    }

    // Call the embedding function
    const result = await createEmbedding(audioFiles, currentModel);

    // Return the response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error creating embeddings:", error);
    return NextResponse.json({ error: "Failed to create embeddings" }, { status: 500 });
  }
}
