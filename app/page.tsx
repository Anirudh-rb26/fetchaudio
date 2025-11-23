import ChatSection from "@/components/chat-section";
import ConfigBar from "@/components/config-sidebar";
import EvalBar from "@/components/eval-sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <div className="flex w-full h-screen items-center justify-center">
      <div className="flex h-full w-[60%] p-2">
        <ChatSection />
      </div>
      <div className="flex h-full w-[40%] py-4 px-2 shadow-md rounded-md">
        <div className="flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden rounded-md shadow-md">

          <Tabs defaultValue="configure" className="flex flex-col w-full h-full">
            <TabsList className="mb-2 w-full shrink-0">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            </TabsList>
            <TabsContent value="configure" className="rounded-md border min-h-0">
              <ConfigBar />
            </TabsContent>
            <TabsContent value="evaluation" className="rounded-md border min-h-0">
              <EvalBar />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}