"use client"

import { Player } from './player';
import { Loader2Icon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { FetchAudio } from '@/services/fetch-audio';

export interface AudioFile {
    id: string;
    name: string;
    duration?: string;
    location: string;
}

const AudioFiles = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);

    const togglePlay = (id: string) => {
        setPlayingId(playingId === id ? null : id);
    };

    useEffect(() => {
        async function loadAudioFiles() {
            setIsLoading(true);
            try {
                const files = await FetchAudio();
                setAudioFiles(files);
            } catch (error) {
                console.error('Failed to load audio files:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadAudioFiles();
    }, []);

    return (
        <div className='flex w-full h-full flex-col gap-6'>
            <div className='flex w-full flex-row items-center justify-between '>
                <h1>Audio Files</h1>
                <p className='text-green-300'>{audioFiles.length}</p>
            </div>
            <div className='flex flex-col items-start h-full justify-center rounded-md bg-black p-2'>
                {
                    isLoading ? (
                        <div>
                            <Loader2Icon className='animate-spin' />
                        </div>

                    ) : (
                        <div className='flex flex-col w-full gap-3 overflow-y-auto'>
                            {/* <ScrollArea className='h-[400px]'> */}
                            <div className='h-95 overflow-y-auto space-y-2'>
                                {audioFiles.map((file, index) => {
                                    const currentId = file.id || `file-${index}`;
                                    return (
                                        <Player
                                            key={currentId}
                                            currentId={currentId}
                                            index={index}
                                            togglePlay={togglePlay}
                                            playingId={playingId}
                                            file={file}
                                        />
                                    );
                                })}
                            </div>
                            {/* </ScrollArea> */}
                        </div>
                    )
                }
            </div>
        </div >
    )
}

export default AudioFiles