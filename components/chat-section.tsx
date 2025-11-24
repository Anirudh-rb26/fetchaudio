"use client"

// --- Imports from ChatSection UI and Search Logic ---
import { Send, Loader2, Play, Pause, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { Separator } from './ui/separator';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player } from './player';

// --- Interface Definitions (Audio Search) ---
interface AudioFile {
    id: string;
    name: string;
    location: string;
    duration?: string;
}

interface AudioSearchResult {
    audioFile: AudioFile;
    similarity: number;
    label: string;
}


interface Message {
    id: number | string;
    text: string;
    type: 'user' | 'assistant';
    timestamp: Date;
    results?: AudioSearchResult[];
}

// --- Audio Search API Call (Now Integrated) ---
const searchAudio = async (prompt: string, currentModel: string): Promise<AudioSearchResult[]> => {
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                model: currentModel, // Default model
                topK: 3,
                includeMetadata: true
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to search audio');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Search failed');
        }

        return data.results || [];
    } catch (error) {
        console.error('Audio search error:', error);
        throw error;
    }
};

// --- ChatSection Component (Fixed with Search Logic) ---

const ChatSection = ({ currentModel }: { currentModel: string }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            text: "👋 Hi! I can help you find audio samples using text. Try searching for **'funky drums'** or **'ambient pad'**!",
            type: 'assistant',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const togglePlay = (id: string) => {
        setPlayingId(prevId => (prevId === id ? null : id));
    };

    const handleSearch = async (userPrompt: string) => {
        if (!userPrompt.trim() || isLoading) return;

        console.log("userprompt: ", userPrompt);

        setIsLoading(true);
        setPlayingId(null); // Stop any currently playing audio
        setError(null);

        // 1. Add user message
        const newUserMessage: Message = {
            id: Date.now() * 1000 + 1,
            text: userPrompt,
            type: 'user',
            timestamp: new Date(),
        };

        console.log("newUserMessage: ", newUserMessage);

        setMessages(prevMessages => [...prevMessages, newUserMessage]);

        try {
            // 2. Perform search via API
            const audioResults = await searchAudio(userPrompt, currentModel);

            console.log("audioresult: ", audioResults);

            // 3. Construct assistant content with "cliche" text
            const assistantContent = audioResults.length > 0
                ? `Fantastic query! Here is what I found for **"${userPrompt}"**. I've pinpointed the top ${audioResults.length} most similar samples based on your request. A similar file is listed below—hope it inspires your next track!`
                : `Hm, I came up empty for **"${userPrompt}"**. The sample library might not contain that exact match. Try adjusting your prompt, like using 'kick drum' instead of 'thump'!`;

            // 4. Add assistant message with results
            const newAssistantMessage: Message = {
                id: Date.now() * 1000 + 2,
                text: assistantContent,
                type: 'assistant',
                results: audioResults,
                timestamp: new Date(),
            };

            console.log("newAssistantMessage: ", newAssistantMessage);

            setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
        } catch (err) {
            // Handle API errors
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);

            const errorAssistantMessage: Message = {
                id: Date.now() * 1000 + 2,
                text: `⚠️ Oops! Something went wrong while searching: **${errorMessage}**. Please try again or check if the audio embeddings have been generated.`,
                type: 'assistant',
                timestamp: new Date(),
            };

            setMessages(prevMessages => [...prevMessages, errorAssistantMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = (): void => {
        if (inputValue.trim() && !isLoading) {
            const currentInput = inputValue;
            setInputValue(''); // Clear input immediately
            handleSearch(currentInput);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Helper to render text with basic markdown (for bolding)
    const renderContent = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
        return <p className="text-sm whitespace-pre-wrap">{parts}</p>;
    };

    return (
        <div ref={containerRef} className="relative flex flex-col w-full h-full bg-primary-foreground p-4 rounded-md">
            <div className='flex w-full flex-col items-start'>
                <h1 className="flex items-center gap-2 text-xl font-bold"><Music className="w-5 h-5" /> Audio Search Chat</h1>
                <Separator className='mt-2' />
            </div>

            {/* Messages Area - Adjusted height for fixed input */}
            <ScrollArea className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <Card
                                    className={`max-w-[80%] p-4 ${message.type === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                        }`}
                                >
                                    <div className="mb-2">
                                        {renderContent(message.text)}
                                    </div>

                                    {/* Audio Results */}
                                    {message.results && message.results.length > 0 && (
                                        <div className="space-y-2 mt-3">
                                            {message.results.map((result, index) => (
                                                result.audioFile.location && (
                                                    <Player
                                                        key={result.audioFile.id}
                                                        currentId={result.audioFile.id}
                                                        index={index}
                                                        togglePlay={togglePlay}
                                                        playingId={playingId}
                                                        file={result.audioFile}
                                                    // similarity={result.similarity}
                                                    // label={result.label}
                                                    />
                                                )
                                            ))}
                                        </div>
                                    )}

                                    <span className={`text-xs mt-3 block ${message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </Card>
                            </motion.div>
                        ))}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <Card className="bg-muted p-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span className="text-sm text-muted-foreground">Searching audio samples...</span>
                                    </div>
                                </Card>
                            </div>
                        )}

                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>


            {/* Fixed Input Area at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-primary-foreground">
                <motion.div
                    className="flex gap-2 items-end"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search for audio samples (e.g., 'vintage synth pad')"
                        className="flex-1 min-h-10 max-h-[120px] resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <Button
                            onClick={handleSend}
                            size="icon"
                            className="shrink-0"
                            disabled={!inputValue.trim() || isLoading}
                        >
                            <motion.div
                                animate={inputValue.trim() ? { rotate: [0, -10, 10, 0] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </motion.div>
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default ChatSection;