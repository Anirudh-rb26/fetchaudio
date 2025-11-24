import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { AudioFile } from '@/lib/types/type';
import React, { useEffect, useRef, useState } from 'react';

interface PlayerProps {
    currentId: string;
    index: number;
    togglePlay: (id: string) => void;
    playingId: string | null;
    file: AudioFile;
}

const ScrollingText = ({ text, className = "", isHovered }: { text: string; className?: string; isHovered: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [textWidth, setTextWidth] = useState(0);

    useEffect(() => {
        const checkWidth = () => {
            if (containerRef.current && textRef.current) {
                const containerW = containerRef.current.offsetWidth;
                const textW = textRef.current.scrollWidth;
                setTextWidth(textW);
                setShouldScroll(textW > containerW);
            }
        };

        checkWidth();
        const observer = new ResizeObserver(checkWidth);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [text]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden whitespace-nowrap w-full ${className}`}
            style={{
                maskImage: shouldScroll && isHovered
                    ? 'linear-gradient(to right, black 0%, black 85%, transparent 100%)'
                    : 'none',
            }}
        >
            {shouldScroll && isHovered ? (
                <motion.div
                    className="inline-flex gap-8"
                    animate={{
                        x: [0, -(textWidth + 32)],
                    }}
                    transition={{
                        duration: Math.max(textWidth * 0.015, 3),
                        ease: "linear",
                        repeat: Infinity,
                    }}
                >
                    <span ref={textRef} className="shrink-0">
                        {text}
                    </span>
                    <span className="shrink-0" aria-hidden="true">
                        {text}
                    </span>
                </motion.div>
            ) : (
                <span ref={textRef} className="block truncate">
                    {text}
                </span>
            )}
        </div>
    );
};

export const Player = ({ currentId, index, togglePlay, playingId, file }: PlayerProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const audioRef = useRef<HTMLAudioElement>(null);
    const isPlaying = playingId === currentId;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.play().catch(err => console.error('Audio play error:', err));
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    const handleAudioEnded = () => {
        togglePlay(currentId);
    };

    return (
        <>
            <audio
                ref={audioRef}
                src={file.location}
                onEnded={handleAudioEnded}
                preload="metadata"
            />
            <motion.div
                key={currentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`group relative flex items-center gap-3 rounded-lg border p-2 transition-all ${isPlaying
                    ? 'bg-neutral-900 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'bg-black border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50'
                    }`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Button
                    onClick={() => togglePlay(currentId)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all ${isPlaying
                        ? 'bg-transparent text-white hover:text-red-500 '
                        : 'bg-transparent text-neutral-400 group-hover:bg-neutral-700 group-hover:text-blue-600'
                        }`}
                >
                    {isPlaying ? (
                        <Pause fill="currentColor" />
                    ) : (
                        <Play fill="currentColor" className="ml-0.5" />
                    )}
                </Button>

                <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                    <ScrollingText
                        text={file.name}
                        className={`font-medium text-xs ${isPlaying ? 'text-blue-400' : 'text-neutral-200'}`}
                        isHovered={isHovered}
                    />
                </div>
            </motion.div>
        </>
    );
};
