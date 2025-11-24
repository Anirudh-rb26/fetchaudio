import {
  AudioFile,
  ConfusionMatrixData,
  EmbeddingPoint,
  EmbeddingResponse,
  EvalMetric,
} from "@/lib/types/type";
import { NextRequest, NextResponse } from "next/server";

// Mock function - replace with your actual implementation
async function createEmbedding(
  currentModel: string,
  audioFiles: AudioFile[]
): Promise<EmbeddingResponse> {
  // Simulate long-running process
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock data - replace with actual embedding logic
  const embeddingPoints: EmbeddingPoint[] = audioFiles.map((file) => ({
    id: file.id,
    x: Math.random() * 100,
    y: Math.random() * 100,
    label: file.name,
    audioSample: file.location,
  }));

  const confusionMatrixData: ConfusionMatrixData = [
    { predicted: "Keys", keys: 18, drums: 2, guitar: 2 },
    { predicted: "Drums", keys: 1, drums: 19, guitar: 2 },
    { predicted: "Guitar", keys: 5, drums: 12, guitar: 1 },
  ];

  const evalMetrics: EvalMetric[] = [
    { label: "Accuracy", value: 0.92 },
    { label: "Precision", value: 0.89 },
    { label: "Recall", value: 0.91 },
    { label: "F1-Score", value: 0.1 },
  ];

  return {
    embeddingPoints,
    confusionMatrixData,
    evalMetrics,
  };
}

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
    const result = await createEmbedding(currentModel, audioFiles);

    // Return the response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error creating embeddings:", error);
    return NextResponse.json({ error: "Failed to create embeddings" }, { status: 500 });
  }
}

// Optional: Support GET for testing
export async function GET() {
  return NextResponse.json(
    { message: "Use POST method with currentModel and audioFiles in body" },
    { status: 405 }
  );
}
