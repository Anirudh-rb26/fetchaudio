"use client"

import { Button } from './ui/button'
import React, { useState } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Separator } from './ui/separator'
import AudioFiles from './audio-files'

const models = [
    "LAION/CLAP (HTSAT Fused)",
    "Microsoft/CLAP",
    "LAION/AudioCLIP",
]

const ConfigBar = () => {
    const [currentModel, setCurrentModel] = useState<string | null>(null);
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
                    <Separator className='mx-2' />
                </div>
                <AudioFiles />
            </div>
        </div>
    )
}

export default ConfigBar