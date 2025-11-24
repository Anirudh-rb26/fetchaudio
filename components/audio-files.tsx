"use client"

import { Player } from './player';
import { Loader2Icon } from 'lucide-react';
import { AudioFile } from '@/lib/types/type';
import { FetchAudio } from '@/services/fetch-audio';
import React, { SetStateAction, useEffect, useState, useMemo } from 'react'

const AudioFiles = ({ audioFiles, setAudioFiles }: { audioFiles: AudioFile[], setAudioFiles: React.Dispatch<SetStateAction<AudioFile[]>> }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [playingId, setPlayingId] = useState<string | null>(null);

    const togglePlay = (id: string) => {
        setPlayingId(playingId === id ? null : id);
    };

    // gated useEffect
    useEffect(() => {
        if (audioFiles.length > 0) {
            return;
        }

        let isMounted = true;

        async function loadAudioFiles() {
            setIsLoading(true);
            try {
                const files = await FetchAudio();
                if (isMounted) {
                    setAudioFiles(files);
                }
            } catch (error) {
                console.error('Failed to load audio files:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadAudioFiles();

        return () => { isMounted = false };
    }, [audioFiles.length, setAudioFiles]);

    const renderedAudioList = useMemo(() => {
        return audioFiles.map((file, index) => {
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
        });
    }, [audioFiles, playingId]);


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
                            <div className='h-85 overflow-y-auto space-y-2'>
                                {renderedAudioList}
                            </div>
                        </div>
                    )
                }
            </div>
        </div >
    )
}

export default AudioFiles