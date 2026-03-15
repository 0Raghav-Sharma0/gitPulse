"use client";

import { motion } from "framer-motion";
import { MessageSquare, GitBranch, Shield, Users, Activity, Layers, Code2 } from "lucide-react";

export default function BentoFeatures() {
    return (
        <section className="w-full max-w-5xl mx-auto px-4 py-12 md:py-16 relative z-10">
            <div className="text-center mb-10">
                <h2 className="font-display text-4xl md:text-5xl mb-4 text-foreground">
                    One place to master any repo
                </h2>
                <p className="text-foreground-muted text-lg md:text-xl max-w-xl mx-auto mb-8 font-medium">
                    Jump into any GitHub repo or profile and get answers, diagrams, and security checks without leaving the browser.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(200px,auto)]">

                {/* 1. Deep Code Analysis - Large */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 rounded-xl bg-[#FEF9F2] border-2 border-black p-8 flex flex-col justify-between relative overflow-hidden group hover:bg-amber-50/80 transition-colors"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F9C79A]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-[#F9C79A] border-2 border-black flex items-center justify-center mb-6">
                            <Code2 className="w-6 h-6 text-gray-900" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Full-repo intelligence</h3>
                        <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                            GitPulse reads your entire codebase in one pass. Get answers about structure, patterns, and intent without cloning or opening files yourself.
                        </p>
                    </div>

                    {/* Decorative Background */}
                    <div className="absolute bottom-0 right-0 w-2/3 h-1/2 bg-gradient-to-t from-[#F9C79A]/20 to-transparent border-t border-l border-black/10 rounded-tl-2xl text-[10px] text-gray-500 font-mono p-4 overflow-hidden pointer-events-none">
                        {'// Index and parse in one pass'}<br />
                        {'const ctx = await scanRepo(owner, repo);'}<br />
                        {'ctx.files.forEach(f => {'}<br />
                        &nbsp;&nbsp;{'indexSymbols(f.path, f.ast);'}<br />
                        {'});'}
                    </div>
                </motion.div>

                {/* 2. Ask Your Repo - Medium */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1 rounded-xl bg-[#FEF9F2] border-2 border-black p-8 relative overflow-hidden group hover:bg-amber-50/80 transition-colors"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center">
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-xl bg-[#F9C79A] border-2 border-black flex items-center justify-center mb-4">
                                <MessageSquare className="w-5 h-5 text-gray-900" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Talk to your repo</h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                Ask in plain language. Get precise answers about where things live, how they connect, and why they’re implemented that way.
                            </p>
                        </div>
                        <div className="w-full sm:w-48 bg-white border-2 border-black rounded-xl p-3 shadow-inner">
                            <div className="text-xs text-gray-600 font-mono mb-2">Prompt:</div>
                            <div className="text-sm text-gray-800">How does authentication work here?</div>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Architecture Visualizer - Small */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-xl bg-[#FEF9F2] border-2 border-black p-6 flex flex-col relative overflow-hidden group hover:bg-amber-50/80 transition-colors"
                >
                    <div className="w-10 h-10 rounded-xl bg-[#F9C79A] border-2 border-black flex items-center justify-center mb-4 relative z-10">
                        <GitBranch className="w-5 h-5 text-gray-900" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Diagrams on demand</h3>
                        <p className="text-gray-700 text-xs leading-relaxed">
                            Get flowcharts and dependency graphs for routes, modules, or data flow—generated from the real code.
                        </p>
                    </div>
                </motion.div>

                {/* 4. Security & Vulnerability - Small */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-xl bg-[#FEF9F2] border-2 border-black p-6 flex flex-col relative overflow-hidden group hover:bg-amber-50/80 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield className="w-24 h-24 text-gray-400" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#F9C79A] border-2 border-black flex items-center justify-center mb-4 relative z-10">
                        <Shield className="w-5 h-5 text-gray-900" />
                    </div>
                    <div className="relative z-10 mt-auto">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Vulnerability scan</h3>
                        <p className="text-gray-700 text-xs leading-relaxed">
                            Surface hardcoded secrets, unsafe patterns, and dependency risks without running anything locally.
                        </p>
                    </div>
                </motion.div>

                {/* 5. GitHub Profiles - Medium */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-xl bg-[#FEF9F2] border-2 border-black p-8 flex flex-col justify-center relative overflow-hidden group hover:bg-amber-50/80 transition-colors"
                >
                    <div className="w-10 h-10 rounded-xl bg-[#F9C79A] border-2 border-black flex items-center justify-center mb-4 relative z-10">
                        <Users className="w-5 h-5 text-gray-900" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Developer insights</h3>
                        <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                            See a developer’s languages, top repos, and contribution patterns so you can evaluate fit or learn from their work.
                        </p>
                    </div>
                    <Activity className="absolute bottom-[-10%] right-[5%] w-48 h-48 text-[#F9C79A]/20 group-hover:text-[#F9C79A]/30 transition-colors duration-500 pointer-events-none" />
                </motion.div>

                {/* 6. Tech Stack - Medium */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1 rounded-xl bg-[#FEF9F2] border-2 border-black p-8 flex flex-col justify-center relative overflow-hidden group hover:bg-amber-50/80 transition-colors"
                >
                    <div className="flex gap-4 items-center relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-[#F9C79A] border-2 border-black flex items-center justify-center shrink-0">
                            <Layers className="w-6 h-6 text-gray-900" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Stack breakdown</h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                See every framework, library, and version in the repo at a glance—no package digging required.
                            </p>
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
