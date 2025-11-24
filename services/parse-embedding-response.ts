import { ConfusionMatrixData, EmbeddingPoint, EvalMetric } from "@/lib/types/type";

export function parseEmbeddingResponse(embeddingResponse: string): {
  parsedEmbeddingResults: EmbeddingPoint[];
  parsedConfusionMatrixResult: ConfusionMatrixData;
  parsedMetricsResult: EvalMetric[];
} {
  // Initialize default return values
  let parsedEmbeddingResults: EmbeddingPoint[] = [];
  let parsedConfusionMatrixResult: ConfusionMatrixData = [];
  let parsedMetricsResult: EvalMetric[] = [];

  if (!embeddingResponse) {
    return {
      parsedEmbeddingResults,
      parsedConfusionMatrixResult,
      parsedMetricsResult,
    };
  }

  try {
    // Attempt to parse as JSON first
    const jsonResponse = JSON.parse(embeddingResponse);

    // Map to correct property names from EmbeddingResponse type
    parsedEmbeddingResults =
      jsonResponse.embeddingPoints ||
      jsonResponse.embeddingResults ||
      jsonResponse.embeddings ||
      [];
    parsedConfusionMatrixResult =
      jsonResponse.confusionMatrixData || jsonResponse.confusionMatrix || [];
    parsedMetricsResult = jsonResponse.evalMetrics || jsonResponse.metrics || [];

    return {
      parsedEmbeddingResults,
      parsedConfusionMatrixResult,
      parsedMetricsResult,
    };
  } catch (e) {
    // If JSON parsing fails, try extracting data using regex patterns
    console.warn("JSON parsing failed, attempting regex extraction", e);
  }

  // Extract embedding points using regex
  const embeddingMatch = embeddingResponse.match(
    /(?:embeddingPoints|embeddingResults|embeddings)["\s:]+(\[[\s\S]*?\](?:\s*,|\s*\}))/i
  );
  if (embeddingMatch) {
    try {
      const cleanedMatch = embeddingMatch[1].replace(/,\s*[}\]]$/, "");
      parsedEmbeddingResults = JSON.parse(cleanedMatch);
    } catch (e) {
      console.error("Failed to parse embedding points:", e);
    }
  }

  // Extract confusion matrix using regex
  const confusionMatch = embeddingResponse.match(
    /(?:confusionMatrixData|confusionMatrix)["\s:]+(\[[\s\S]*?\](?:\s*,|\s*\}))/i
  );
  if (confusionMatch) {
    try {
      const cleanedMatch = confusionMatch[1].replace(/,\s*[}\]]$/, "");
      parsedConfusionMatrixResult = JSON.parse(cleanedMatch);
    } catch (e) {
      console.error("Failed to parse confusion matrix:", e);
    }
  }

  // Extract metrics using regex
  const metricsMatch = embeddingResponse.match(
    /(?:evalMetrics|metrics)["\s:]+(\[[\s\S]*?\](?:\s*,|\s*\}|\s*$))/i
  );
  if (metricsMatch) {
    try {
      const cleanedMatch = metricsMatch[1].replace(/,\s*[}\]]$/, "");
      parsedMetricsResult = JSON.parse(cleanedMatch);
    } catch (e) {
      console.error("Failed to parse metrics:", e);
    }
  }

  return {
    parsedEmbeddingResults,
    parsedConfusionMatrixResult,
    parsedMetricsResult,
  };
}
