"use client";

import { Fragment, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, X, Brain, Database } from "lucide-react";

export default function CAGComparison() {
    const ragChunks = useMemo(
        () =>
            Array.from({ length: 6 }, (_, i) => {
                const angle = ((i * 360) / 6) * (Math.PI / 180);
                const radius = 70 + i * 12;
                return {
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    rotate: -35 + i * 14,
                };
            }),
        []
    );

    return (
        <section id="cag-comparison" className="py-12 md:py-16 px-4 relative overflow-hidden">
            <div className="max-w-5xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-10"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
                        Agentic CAG vs. Traditional RAG
                    </h2>
                    <p className="text-gray-700 text-lg max-w-xl mx-auto font-medium">
                        GitPulse uses <strong>Agentic Context Augmented Generation (Agentic CAG)</strong>. We don&apos;t just retrieve fragments; we understand the whole picture.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Traditional RAG Card */}
                    <div className="bg-[#FEF9F2] border-2 border-black rounded-xl p-8 cursor-default flex flex-col hover:bg-amber-50/80 transition-colors shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-[#F9C79A] border-2 border-black rounded-lg">
                                <Database className="w-6 h-6 text-gray-900" />
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900">Traditional RAG</h3>
                        </div>

                        {/* RAG Animation Canvas */}
                        <div className="w-full h-48 bg-white rounded-xl mb-8 relative overflow-hidden flex items-center justify-center border-2 border-black shadow-inner">
                            <motion.div
                                className="absolute w-32 h-32 bg-gray-200 rounded-md flex flex-col gap-1 p-2 opacity-50"
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: [1, 1.1, 0], opacity: [1, 0.5, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <div className="h-4 bg-gray-400 rounded w-3/4 mb-2"></div>
                                <div className="h-2 bg-gray-400 rounded w-full"></div>
                                <div className="h-2 bg-gray-400 rounded w-5/6"></div>
                                <div className="h-2 bg-gray-400 rounded w-full"></div>
                            </motion.div>

                            {/* Chopped chunks flying away */}
                            {ragChunks.map((chunk, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-12 h-12 bg-red-900/30 border border-red-500/50 rounded flex items-center justify-center text-[10px] text-red-500 font-mono"
                                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                    animate={{
                                        x: chunk.x,
                                        y: chunk.y,
                                        opacity: [0, 1, 0],
                                        scale: [0.5, 1, 0.5],
                                        rotate: chunk.rotate,
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 1 + i * 0.2 }}
                                >
                                    chunk_{i}
                                </motion.div>
                            ))}

                            <motion.div
                                className="absolute bottom-4 right-4 text-xs font-mono text-gray-600 bg-gray-200 px-2 py-1 rounded"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 1, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                Context lost...
                            </motion.div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1 bg-red-500/10 rounded-full shrink-0">
                                    <X className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">Fragmented Context</h4>
                                    <p className="text-xs text-gray-600 mt-1">Chops code into disconnected vector chunks, losing the big picture.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1 bg-red-500/10 rounded-full shrink-0">
                                    <X className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">Similarity Search Flaws</h4>
                                    <p className="text-xs text-gray-600 mt-1">Relies on fuzzy matching which often misses logic buried in imports.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GitPulse Agentic CAG Card */}
                    <div className="bg-[#FEF9F2] border-2 border-black rounded-xl p-8 relative overflow-hidden hover:bg-amber-50/80 transition-colors cursor-default flex flex-col shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F9C79A]/30 blur-[50px] rounded-full" />

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="p-3 bg-[#F9C79A] border-2 border-black rounded-lg">
                                <Brain className="w-6 h-6 text-gray-900" />
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900">GitPulse (Agentic CAG)</h3>
                        </div>

                        {/* Agentic CAG Animation Canvas */}
                        <div className="w-full h-48 bg-white rounded-xl mb-8 relative overflow-hidden flex items-center justify-center border-2 border-black shadow-inner z-10">
                            {/* Glowing central node */}
                            <motion.div
                                className="absolute w-16 h-16 bg-[#F9C79A] border-2 border-black rounded-full shadow-[0_0_20px_rgba(249,199,154,0.5)] flex items-center justify-center text-gray-900 font-mono text-xs font-bold"
                                animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(59,130,246,0.3)", "0 0 40px rgba(59,130,246,0.6)", "0 0 20px rgba(59,130,246,0.3)"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                LM
                            </motion.div>

                            {/* Connected File Nodes */}
                            {[...Array(5)].map((_, i) => {
                                const angle = (i * (360 / 5)) * (Math.PI / 180);
                                const radius = 60;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                return (
                                    <Fragment key={`node-group-${i}`}>
                                        {/* Connection Lines */}
                                        <motion.svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                                            <motion.line
                                                x1="50%" y1="50%"
                                                x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                                                stroke="#1f2937" strokeWidth="2" strokeOpacity="0.5"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: [0, 1, 1] }}
                                                transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                            />
                                        </motion.svg>

                                        {/* Nodes */}
                                        <motion.div
                                            key={`node-${i}`}
                                            className="absolute w-8 h-8 bg-[#F9C79A] border-2 border-black rounded flex items-center justify-center text-[8px] text-gray-900 font-mono"
                                            style={{ left: `calc(50% + ${x - 16}px)`, top: `calc(50% + ${y - 16}px)` }}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, delay: i * 0.2 }}
                                        >
                                            .ts
                                        </motion.div>
                                    </Fragment>
                                );
                            })}

                            <motion.div
                                className="absolute bottom-4 left-4 text-xs font-mono text-gray-800 bg-[#F9C79A] px-2 py-1 rounded border-2 border-black"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                1M+ Token Context Active
                            </motion.div>
                        </div>

                        <div className="space-y-4 flex-1 relative z-10">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1 bg-[#F9C79A] rounded-full shrink-0 border border-black">
                                    <Check className="w-4 h-4 text-gray-900" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">Full File Context</h4>
                                    <p className="text-xs text-gray-600 mt-1">Loads entire relevant files into the 1M+ token window for flawless logic tracing.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1 bg-[#F9C79A] rounded-full shrink-0 border border-black">
                                    <Check className="w-4 h-4 text-gray-900" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">Smart Agent Selection</h4>
                                    <p className="text-xs text-gray-600 mt-1">AI intelligently pulls exact full-file dependencies needed.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
