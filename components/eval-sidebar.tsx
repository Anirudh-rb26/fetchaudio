/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CartesianGrid, XAxis, YAxis, Bar, BarChart, ScatterChart, Scatter, ZAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// --- Types ---
interface EmbeddingPoint {
    id: string;
    x: number;
    y: number;
    label: string;
    audioSample?: string;
    textQuery?: string;
}

interface ConfusionMatrixData {
    predicted: string;
    keys: number;
    drums: number;
}

interface EvalBarProps {
    embeddings?: EmbeddingPoint[];
    confusionMatrix?: ConfusionMatrixData[];
    modelName?: string;
}

interface Evalmetrics {
    label: string;
    value: number;
}

// --- Mock Data ---
const mockEmbeddings: EmbeddingPoint[] = [
    { id: 'k1', x: 0.8, y: 0.7, label: 'keys', textQuery: 'piano melody' },
    { id: 'k2', x: 0.75, y: 0.65, label: 'keys', audioSample: 'keys_01.wav' },
    { id: 'k3', x: 0.85, y: 0.75, label: 'keys', textQuery: 'synth pad' },
    { id: 'd1', x: 0.3, y: 0.25, label: 'drums', textQuery: 'kick drum' },
    { id: 'd2', x: 0.25, y: 0.2, label: 'drums', audioSample: 'drums_01.wav' },
];

const mockConfusionMatrix: ConfusionMatrixData[] = [
    { predicted: 'Keys', keys: 18, drums: 2 },
    { predicted: 'Drums', keys: 1, drums: 19 },
];

// --- Styles ---
const COLOR_1 = "#475d75";
const COLOR_2 = "#204176";

const GlassyCard = ({ children, className = "", title, subtitle }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string }) => (
    <div className={`w-full flex flex-col rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl overflow-hidden ${className}`}>
        {(title || subtitle) && (
            <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-white/5">
                {title && <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>}
                {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
            </div>
        )}
        <div className="flex-1 min-h-0 min-w-0 w-full p-2 relative">
            {children}
        </div>
    </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="border border-white/10 rounded-lg p-3 shadow-2xl min-w-[150px] bg-primary-foreground">
                <p className="font-bold text-sm text-zinc-100 mb-1">{data.label ? data.label.toUpperCase() : data.predicted}</p>
                <div className="space-y-1">
                    {data.id && <p className="text-xs text-zinc-100 font-mono">ID: {data.id}</p>}
                    {payload.map((entry: any, idx: number) => (
                        <p key={idx} className="text-xs text-zinc-100">
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const EvalBar = ({
    embeddings = mockEmbeddings,
    confusionMatrix = mockConfusionMatrix,
    modelName = 'LAION/CLAP (HTSAT Fused)'
}: EvalBarProps) => {
    const keysData = embeddings.filter(e => e.label === 'keys');
    const drumsData = embeddings.filter(e => e.label === 'drums');

    return (

        <div className='flex flex-col h-full w-full bg-primary-foreground overflow-hidden relative'>

            {/* HEADER */}
            <div className="p-4">
                <h2 className="text-lg font-bold ">
                    Evaluation Dashboard
                </h2>
                <p className="text-xs font-mono text-zinc-500 truncate mt-1">Model: {modelName}</p>
            </div>

            <div className="flex-1 min-h-0 w-full relative">
                <ScrollArea className="h-full w-full">

                    <div className="flex flex-col gap-4 p-4 max-w-full">

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full min-w-0 ">
                            <GlassyCard title="Latent Space" subtitle="t-SNE Projection" className="h-80">
                                <ResponsiveContainer width="99%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                        <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis type="number" dataKey="y" domain={[0, 1]} tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <ZAxis range={[50, 50]} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#ffffff20' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Scatter name="Keys" data={keysData} fill={COLOR_1} shape="circle" />
                                        <Scatter name="Drums" data={drumsData} fill={COLOR_2} shape="circle" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </GlassyCard>
                        </motion.div>

                        {/* CHART 2: Confusion Matrix */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="w-full min-w-0">
                            <GlassyCard title="Confusion Matrix" subtitle="Class Separation" className="h-[280px]">
                                <ResponsiveContainer width="99%" height="100%">
                                    <BarChart data={confusionMatrix} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                        <CartesianGrid vertical={false} stroke="#ffffff10" />
                                        <XAxis dataKey="predicted" tick={{ fill: '#777', fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fill: '#777', fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Bar dataKey="keys" name="Keys" fill={COLOR_1} radius={[4, 4, 0, 0]} stackId="a" />
                                        <Bar dataKey="drums" name="Drums" fill={COLOR_2} radius={[4, 4, 0, 0]} stackId="a" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </GlassyCard>
                        </motion.div>

                        {/* METRICS GRID */}
                        <motion.div
                            className="grid grid-cols-2 lg:grid-cols-2 gap-3 w-full min-w-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {[
                                { label: 'Accuracy', value: 92.5 },
                                { label: 'Precision', value: 24.7, },
                                { label: 'Recall', value: 30.0, },
                                { label: 'F1-Score', value: 42.3, },
                            ].map((m) => (
                                <div key={m.label} className="flex flex-col justify-center items-center p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm shadow-lg overflow-hidden min-w-0">
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{m.label}</span>
                                    <span
                                        className={` text-2xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] 
                                            ${m.value > 75
                                                ? "text-green-500"
                                                : m.value < 25
                                                    ? "text-red-500"
                                                    : "text-yellow-500"
                                            }
  `}
                                    >

                                        {m.value}
                                    </span>
                                </div>
                            ))}
                        </motion.div>

                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default EvalBar;