"use client"

import { Button } from './ui/button'
import AudioFiles from './audio-files'
import { Separator } from './ui/separator'
import { AudioFile } from '@/lib/types/type'
import React, { SetStateAction } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'

const handleCreateEmbeddings = async (
    currentModel: string | null,
    audioFiles: AudioFile[],
    setEmbeddingResponse: React.Dispatch<SetStateAction<string | null>>
) => {
    if (!currentModel) {
        console.error("Cannot create embeddings: No model selected.");
        return;
    }

    console.log(`Button Clicked with data: ${currentModel} and audioFiles of length ${audioFiles.length}`);

    try {
        const response = await fetch('/api/run-embedding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentModel: currentModel,
                audioFiles: audioFiles,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error (${response.status}):`, errorText);
            return;
        }

        const data = await response.json();

        console.log("Actual Data from API:", data);

        setEmbeddingResponse(JSON.stringify(data));

    } catch (error) {
        console.error("Network or Parsing Error:", error);
    }
};

const models = [
    "LAION/CLAP (HTSAT Fused)",
    "Microsoft/CLAP",
    "LAION/AudioCLIP",
]

interface ConfigBarProps {
    audioFiles: AudioFile[];
    currentModel: string | null;

    setCurrentModel: React.Dispatch<SetStateAction<string | null>>;
    setAudioFiles: React.Dispatch<SetStateAction<AudioFile[]>>

    setEmbeddingResponse: React.Dispatch<SetStateAction<string | null>>
}

const ConfigBar = ({ audioFiles, setAudioFiles, currentModel, setCurrentModel, setEmbeddingResponse }: ConfigBarProps) => {

    return (
        <div className='flex w-full h-full flex-col gap-6 bg-primary-foreground p-4 rounded-md'>
            <div className='flex w-full flex-col items-start'>
                <h1>Configure</h1>
                <Separator className='mt-2' />
            </div>
            <div className='flex w-full flex-col gap-6 items-start'>
                <div className='flex w-full flex-col items-center gap-4'>
                    <div className='flex flex-col h-full w-full items-start gap-2'>
                        <h3 className='text-sm text-muted-foreground'>Select an Embedding Model</h3>
                        <DropdownMenu >
                            <DropdownMenuTrigger asChild className='w-full'>
                                <Button variant={"outline"}>{currentModel ? currentModel : "Select a Model"}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='min-w-(--radix-dropdown-menu-trigger-width)'>
                                <DropdownMenuLabel>Available Models</DropdownMenuLabel>
                                <DropdownMenuSeparator className='mx-2' />
                                {models.map((modelName, index) => {
                                    return (
                                        <DropdownMenuItem className='flex w-full' key={index} onClick={() => setCurrentModel(modelName)}>{modelName}</DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <Button className='flex w-full items-center justify-center' disabled={currentModel === null} onClick={() => handleCreateEmbeddings(currentModel, audioFiles, setEmbeddingResponse)}>Create Embeddings</Button>
                    <Separator className='mx-2' />
                </div>
                <AudioFiles audioFiles={audioFiles} setAudioFiles={setAudioFiles} />
            </div>
        </div>
    )
}

export default ConfigBar