export type AudioFile = {
  id: string;
  name: string;
  duration?: string;
  location: string;
};

export type EmbeddingPoint = {
  id: string;
  x: number;
  y: number;
  label: string;
  audioSample?: string;
  textQuery?: string;
};

export type ConfusionMatrixRow = {
  predicted: string;
  [actualClass: string]: number | string;
};

export type ConfusionMatrixData = ConfusionMatrixRow[];

export type EvalMetric = {
  label: string;
  value: number;
};

export type EmbeddingResponse = {
  embeddingPoints: EmbeddingPoint[];
  confusionMatrixData: ConfusionMatrixData;
  evalMetrics: EvalMetric[];
};
