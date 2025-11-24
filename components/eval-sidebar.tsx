/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfusionMatrixData, EmbeddingPoint, EvalMetric } from '@/lib/types/type';
import { CartesianGrid, XAxis, YAxis, Bar, BarChart, ScatterChart, Scatter, ZAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface EvalBarProps {
    embeddings: EmbeddingPoint[];
    confusionMatrix?: ConfusionMatrixData;
    metrics: EvalMetric[];
    modelName: string;
}

type ClassifiedEmbeddingPoint = EmbeddingPoint & {
    category: string;
    fileName: string;
};

// --- Styles ---
const COLOR_KEYS = "#475d75";
const COLOR_DRUMS = "#204176";
const COLOR_GUITAR = "#76204d";

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
            <div className="border border-white/10 rounded-lg p-3 shadow-2xl min-w-[150px] max-w-[300px] bg-primary-foreground">
                <p className="font-bold text-sm text-zinc-100 mb-1">
                    {data.category ? data.category.toUpperCase() : (data.predicted || '').toUpperCase()}
                </p>
                <div className="space-y-1">
                    {data.id && <p className="text-xs text-zinc-100 font-mono">ID: {data.id}</p>}
                    {data.fileName && (
                        <p className="text-xs text-zinc-400 break-all">{data.fileName}</p>
                    )}
                    {payload.map((entry: any, idx: number) => (
                        entry.name !== 'category' && entry.name !== 'fileName' && (
                            <p key={idx} className="text-xs text-zinc-100">
                                {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                            </p>
                        )
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const classifyAudioFile = (filename: string): string => {
    const lower = filename.toLowerCase();

    if (lower.includes('drum') || lower.includes('kick') || lower.includes('snare') ||
        lower.includes('tom') || lower.includes('bash') || lower.includes('_dr_') ||
        lower.includes('cds_dr') || lower.includes('rim')) {
        return 'drums';
    }

    if (lower.includes('guitar') || lower.includes('_gt_')) {
        return 'guitar';
    }

    return 'keys';
};

const EvalBar = ({
    embeddings,
    confusionMatrix,
    metrics,
    modelName,
}: EvalBarProps) => {
    const classifiedEmbeddings = useMemo(() => {
        if (!embeddings || embeddings.length === 0) return [];

        return embeddings.map(point => {
            const filename = point.label || '';
            const category = classifyAudioFile(filename);

            return {
                ...point,
                category: category,
                fileName: filename
            } as ClassifiedEmbeddingPoint;
        });
    }, [embeddings]);

    const keysData = useMemo(() =>
        classifiedEmbeddings.filter(e => e.category === 'keys'),
        [classifiedEmbeddings]
    );

    const drumsData = useMemo(() =>
        classifiedEmbeddings.filter(e => e.category === 'drums'),
        [classifiedEmbeddings]
    );

    const guitarData = useMemo(() =>
        classifiedEmbeddings.filter(e => e.category === 'guitar'),
        [classifiedEmbeddings]
    );

    const normalizedConfusionMatrix = useMemo(() => {
        if (!confusionMatrix || confusionMatrix.length === 0) return [];

        console.log("Normalizing Confusion Matrix:", confusionMatrix);
        return confusionMatrix;
    }, [confusionMatrix]);

    const hasEmbeddings = classifiedEmbeddings.length > 0;
    const hasConfusionMatrix = normalizedConfusionMatrix.length > 0;
    const hasMetrics = metrics && metrics.length > 0;

    return (
        <div className='flex flex-col h-full w-full bg-primary-foreground overflow-hidden relative'>
            <div className="p-4">
                <h2 className="text-lg font-bold">
                    Evaluation Dashboard
                </h2>
                <p className="text-xs font-mono text-zinc-500 truncate mt-1">Model: {modelName || 'No model selected'}</p>
                <p className="text-xs text-zinc-600 mt-1">
                    Samples: Keys({keysData.length}) | Drums({drumsData.length}) | Guitar({guitarData.length})
                </p>
            </div>

            <div className="flex-1 min-h-0 w-full relative">
                <ScrollArea className="h-full w-full">
                    <div className="flex flex-col gap-4 p-4 max-w-full">

                        {/* CHART 1: Latent Space */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full min-w-0">
                            <GlassyCard title="Latent Space" subtitle="t-SNE Projection" className="h-80">
                                {hasEmbeddings ? (
                                    <ResponsiveContainer width="99%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis
                                                type="number"
                                                dataKey="x"
                                                domain={['dataMin - 5', 'dataMax + 5']}
                                                tick={{ fill: '#555', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                type="number"
                                                dataKey="y"
                                                domain={['dataMin - 5', 'dataMax + 5']}
                                                tick={{ fill: '#555', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <ZAxis range={[50, 50]} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#ffffff20' }} />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                            {keysData.length > 0 && <Scatter name="Keys" data={keysData} fill={COLOR_KEYS} shape="circle" />}
                                            {drumsData.length > 0 && <Scatter name="Drums" data={drumsData} fill={COLOR_DRUMS} shape="circle" />}
                                            {guitarData.length > 0 && <Scatter name="Guitar" data={guitarData} fill={COLOR_GUITAR} shape="circle" />}
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-zinc-500 text-sm">No embedding data available</p>
                                    </div>
                                )}
                            </GlassyCard>
                        </motion.div>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="w-full min-w-0">
                            <GlassyCard title="Confusion Matrix" subtitle="Class Separation" className="h-[280px]">
                                {hasConfusionMatrix ? (
                                    <ResponsiveContainer width="99%" height="100%">
                                        <BarChart data={normalizedConfusionMatrix} margin={{ top: 10, right: 0, bottom: 0, left: -50 }} {...{ overflow: 'visible' }} >
                                            <CartesianGrid vertical={false} stroke="#ffffff10" />
                                            <XAxis dataKey="predicted" tick={{ fill: '#777', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                                            <YAxis tick={false} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                            <Bar dataKey="keys" name="Keys" fill={COLOR_KEYS} radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="drums" name="Drums" fill={COLOR_DRUMS} radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="guitar" name="Guitar" fill={COLOR_GUITAR} radius={[4, 4, 0, 0]} stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-zinc-500 text-sm">No confusion matrix data available</p>
                                    </div>
                                )}
                            </GlassyCard>
                        </motion.div>

                        <motion.div
                            className="grid grid-cols-2 lg:grid-cols-2 gap-3 w-full min-w-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {hasMetrics ? (
                                metrics.map((m) => (
                                    <div key={m.label} className="flex flex-col justify-center items-center p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm shadow-lg overflow-hidden min-w-0">
                                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{m.label}</span>
                                        <span
                                            className={`text-2xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] 
                                                ${m.value > 0.75
                                                    ? "text-green-500"
                                                    : m.value < 0.25
                                                        ? "text-red-500"
                                                        : "text-yellow-500"
                                                }
                                            `}
                                        >
                                            {m.value}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 flex items-center justify-center p-8">
                                    <p className="text-zinc-500 text-sm">No metrics available</p>
                                </div>
                            )}
                        </motion.div>

                    </div>
                </ScrollArea>
            </div >
        </div >
    );
};

export default EvalBar;