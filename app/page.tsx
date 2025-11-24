"use client"

import { useEffect, useState } from "react";
import EvalBar from "@/components/eval-sidebar";
import ChatSection from "@/components/chat-section";
import ConfigBar from "@/components/config-sidebar";
import { parseEmbeddingResponse } from "@/services/parse-embedding-response";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioFile, ConfusionMatrixData, EmbeddingPoint, EvalMetric } from "@/lib/types/type";

export default function Home() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  const [embeddingResponse, setEmbeddingResponse] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<EvalMetric[] | null>(null);
  const [embeddingResults, setEmbeddingResults] = useState<EmbeddingPoint[] | null>(null);
  const [confustionMatrix, setConfusionMatrix] = useState<ConfusionMatrixData | null>(null);

  useEffect(() => {
    function updateState(
      { parsedEmbeddingResults, parsedConfusionMatrixResult, parsedMetricsResult }
        : { parsedEmbeddingResults: EmbeddingPoint[], parsedConfusionMatrixResult: ConfusionMatrixData, parsedMetricsResult: EvalMetric[] }) {
      setEmbeddingResults(parsedEmbeddingResults);
      setConfusionMatrix(parsedConfusionMatrixResult);
      setMetrics(parsedMetricsResult);
    }

    console.log("Parsing Response");

    const { parsedEmbeddingResults, parsedConfusionMatrixResult, parsedMetricsResult } = parseEmbeddingResponse(embeddingResponse!);

    console.log("Response Parsed");

    updateState({ parsedEmbeddingResults, parsedConfusionMatrixResult, parsedMetricsResult });

    console.log("states updated");

  }, [embeddingResponse])

  return (
    <div className="flex w-full h-screen items-center justify-center">
      <div className="flex h-full w-[60%] p-2">
        <ChatSection currentModel={currentModel!} />
      </div>
      <div className="flex h-full w-[40%] py-4 px-2 shadow-md rounded-md">
        <div className="flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden rounded-md shadow-md">

          <Tabs defaultValue="configure" className="flex flex-col w-full h-full">
            <TabsList className="mb-2 w-full shrink-0">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            </TabsList>
            <TabsContent value="configure" className="rounded-md border min-h-0">
              <ConfigBar audioFiles={audioFiles} setAudioFiles={setAudioFiles} currentModel={currentModel} setCurrentModel={setCurrentModel} setEmbeddingResponse={setEmbeddingResponse} />
            </TabsContent>
            <TabsContent value="evaluation" className="rounded-md border min-h-0">
              <EvalBar embeddings={embeddingResults!} confusionMatrix={confustionMatrix!} metrics={metrics!} modelName={currentModel!} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}