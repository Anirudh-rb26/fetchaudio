"use client"

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { Separator } from './ui/separator';

// Types
interface Message {
    id: number;
    text: string;
    type: 'sent' | 'received';
    timestamp: Date;
}

type AddResponderMessageFn = ((text: string) => void) | null;

// Store reference to add message function for external access
let addResponderMessageRef: AddResponderMessageFn = null;

// Export function to send message as responder from external file
export const sendResponderMessage = (text: string): void => {
    if (addResponderMessageRef) {
        addResponderMessageRef(text);
    }
};

const ChatSection: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: 'Hello! How can I help you?', type: 'received', timestamp: new Date() }
    ]);
    const [inputValue, setInputValue] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Function to add responder message
    const addResponderMessage = (text: string): void => {
        const newMessage: Message = {
            id: Date.now(),
            text,
            type: 'received',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
    };

    // Store reference for external access
    useEffect(() => {
        addResponderMessageRef = addResponderMessage;
        return () => {
            addResponderMessageRef = null;
        };
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (): void => {
        if (inputValue.trim()) {
            const newMessage: Message = {
                id: Date.now(),
                text: inputValue,
                type: 'sent',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            setInputValue('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div ref={containerRef} className="relative flex flex-col w-full h-full bg-primary-foreground p-4 rounded-md">
            <div className='flex w-full flex-col items-start'>
                <h1>Chat</h1>
                <Separator className='mt-2' />
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.95
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                    mass: 0.8
                                }}
                                className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                            >
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className={`max-w-[70%] px-4 py-2 rounded-md ${message.type === 'sent'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Fixed Input Area at bottom - now relative to parent */}
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
                        placeholder="Type a message..."
                        className="flex-1 min-h-10 max-h-[120px] resize-none"
                        rows={1}
                    />
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <Button
                            onClick={handleSend}
                            size="icon"
                            className="shrink-0"
                        >
                            <motion.div
                                animate={inputValue.trim() ? { rotate: [0, -10, 10, 0] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                <Send className="h-4 w-4" />
                            </motion.div>
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default ChatSection;