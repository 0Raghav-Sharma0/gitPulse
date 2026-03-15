"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import CodeIcon from "@/components/CodeIcon";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Terminal, Code2, BrainCircuit, CheckCircle2, ShieldAlert, GitMerge, ChevronLeft, ChevronRight } from "lucide-react";

function TypewriterText({ text, step }: { text: string; step: number }) {
    const [displayedText, setDisplayedText] = useState(text);

    useEffect(() => {
        if (step === 0) {
            setDisplayedText(text);
            return;
        }
        if (step >= 2) {
            setDisplayedText(text);
            return;
        }

        setDisplayedText("");
        let i = 0;
        const speed = 1500 / text.length;
        const interval = setInterval(() => {
            setDisplayedText(text.substring(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, speed);

        return () => clearInterval(interval);
    }, [text, step]);

    return (
        <span className="whitespace-pre-wrap break-words">
            {displayedText}
            {step === 1 && (
                <span className="inline-block w-[2px] h-[1em] bg-blue-500 animate-pulse align-middle ml-[2px]" />
            )}
        </span>
    );
}

// Define the different scenarios we want to loop through
const scenarios = [
    {
        id: "chat",
        title: "Chat with facebook/react",
        query: "Where is the authentication logic handled in this repository?",
        loadingText: "Reading repository index...",
        analyzingText: "Analyzing relevant files...",
        tags: [
            { icon: Code2, text: "packages/react/src/ReactContext.js", color: "text-green-400" },
            { icon: Code2, text: "packages/react-reconciler/src/ReactFiberHooks.js", color: "text-green-400" },
        ],
        type: "chat",
    },
    {
        id: "architecture",
        title: "Generate Architecture for vercel/next.js",
        query: "Visualize the routing architecture for App Router.",
        loadingText: "Parsing dependency graph...",
        analyzingText: "Generating Mermaid flowchart...",
        tags: [
            { icon: GitMerge, text: "packages/next/src/client/app-router.tsx", color: "text-blue-400" },
            { icon: GitMerge, text: "packages/next/src/server/app-render.tsx", color: "text-blue-400" },
        ],
        type: "architecture",
    },
    {
        id: "security",
        title: "Security Scan for supabase/supabase",
        query: "Are there any exposed secrets or SQL injection vulnerabilities?",
        loadingText: "Scanning abstract syntax trees...",
        analyzingText: "Cross-referencing CVE database...",
        tags: [
            { icon: ShieldAlert, text: "apps/studio/lib/api.ts", color: "text-red-400" },
        ],
        type: "security",
    }
];

export default function InteractiveDemo() {
    const [step, setStep] = useState(0);
    const [scenarioIndex, setScenarioIndex] = useState(0);
    const [playbackKey, setPlaybackKey] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: false, margin: "50px" });

    const handleManualSwitch = (dir: 'next' | 'prev') => {
        if (dir === 'next') {
            setScenarioIndex((prev) => (prev + 1) % scenarios.length);
        } else {
            setScenarioIndex((prev) => (prev === 0 ? scenarios.length - 1 : prev - 1));
        }
        setStep(0);
        setPlaybackKey(k => k + 1);
    };

    useEffect(() => {
        // A simple state machine to drive the animation
        const sequence = [
            { step: 1, delay: 1000 }, // Wait, start typing
            { step: 2, delay: 2500 }, // Finished typing, hit enter, show loading
            { step: 3, delay: 1500 }, // AI starts analyzing context
            { step: 4, delay: 2000 }, // AI starts streaming answer
            { step: 5, delay: 6000 }, // Answer complete, wait before restart
            { step: 0, delay: 1000 }, // Reset and next scenario
        ];

        if (!isInView) return;

        let timer: NodeJS.Timeout;
        const runSequence = (index: number) => {
            // Loop back to the start when reaching the end of the sequence
            const nextIndex = index >= sequence.length ? 0 : index;

            setStep(sequence[nextIndex].step);

            // If we are resetting to step 0, increment the scenario index
            if (nextIndex === 0 && index !== 0) {
                setScenarioIndex((prev) => (prev + 1) % scenarios.length);
            }

            timer = setTimeout(() => runSequence(nextIndex + 1), sequence[nextIndex].delay);
        };

        timer = setTimeout(() => runSequence(0), 1000); // Initial start
        return () => clearTimeout(timer);
    }, [isInView, playbackKey]);

    const currentScenario = scenarios[scenarioIndex];
    const visibleStep = isInView ? step : 0;

    const renderResponse = () => {
        if (currentScenario.type === "chat") {
            return (
                <div className="space-y-3 font-sans text-sm leading-relaxed text-gray-800">
                    <p>
                        In <span className="text-gray-900 font-medium">React</span>, there isn&apos;t traditional &quot;authentication logic&quot; built into the core library, as React is simply a UI library.
                    </p>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        However, state management for authentication is typically handled using <span className="text-blue-700 font-mono text-xs bg-blue-50 px-1 rounded border border-blue-200">React Context</span> and Hooks.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.5 }}
                        className="mt-4 bg-[#FEF9F2] p-3 rounded-lg border-2 border-gray-200 border-l-4 border-l-amber-500"
                    >
                        <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-2">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Recommended Pattern</span>
                        </div>
                        <code className="text-xs text-gray-800 block overflow-hidden break-words whitespace-pre-wrap bg-white p-2 rounded mt-2 border border-gray-200">
                            <span className="text-pink-600">const</span> AuthContext = createContext(<span className="text-orange-600">null</span>);<br />
                            <span className="text-pink-600">export function</span> <span className="text-blue-600">useAuth</span>() {'{'} <br />
                            &nbsp;&nbsp;<span className="text-pink-600">return</span> useContext(AuthContext);<br />
                            {'}'}
                        </code>
                    </motion.div>
                </div>
            );
        }

        if (currentScenario.type === "architecture") {
            return (
                <div className="space-y-3 font-sans text-sm leading-relaxed">
                    <p>
                        The Next.js App Router separates Client and Server components. Here is the requested logic flow:
                    </p>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 bg-gray-50 overflow-hidden rounded-lg border-2 border-gray-200"
                    >
                        {/* Mock Flowchart UI */}
                        <div className="p-4 flex flex-col items-center gap-2 text-xs font-mono">
                            <div className="border-2 border-blue-200 bg-blue-50 text-blue-800 px-4 py-2 rounded font-medium">Client Request</div>
                            <div className="h-4 border-l-2 border-gray-300"></div>
                            <div className="border-2 border-purple-200 bg-purple-50 px-4 py-2 rounded text-purple-800 font-medium">app-router.tsx (Layouts)</div>
                            <div className="h-4 border-l-2 border-gray-300"></div>
                            <div className="border-2 border-green-200 bg-green-50 px-4 py-2 rounded text-green-800 font-medium">app-render.tsx (RSC Payload)</div>
                        </div>
                    </motion.div>
                </div>
            );
        }

        if (currentScenario.type === "security") {
            return (
                <div className="space-y-3 font-sans text-sm leading-relaxed">
                    <p>
                        I analyzed the codebase for standard vulnerabilities and hardcoded secrets.
                    </p>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 bg-red-50 p-3 rounded-lg border-2 border-red-200 border-l-4 border-l-red-500"
                    >
                        <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mb-2">
                            <ShieldAlert className="w-3 h-3" />
                            <span>1 High Severity Issue Found</span>
                        </div>
                        <p className="text-gray-700 mb-2 text-xs">A potentially unparameterized raw SQL query was detected in the studio API.</p>
                        <code className="text-xs text-gray-800 block p-2 bg-gray-100 rounded overflow-hidden break-words whitespace-pre-wrap border border-gray-200">
                            <span className="line-through text-red-400 px-1 bg-red-500/10 inline-block">{"const res = await db.query(`SELECT * FROM users WHERE id = ${id}`);"}</span><br />
                            <span className="text-green-400 px-1 bg-green-500/10 inline-block mt-1">{"+ const res = await db.query(\"SELECT * FROM users WHERE id = $1\", [id]);"}</span>
                        </code>
                    </motion.div>
                </div>
            )
        }
    };

    return (
        <section ref={containerRef} className="py-10 md:py-12 px-4 relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
            <div className="text-center mb-8">
                <h2 className="font-display text-3xl md:text-4xl mb-3 text-foreground">
                    See it in Action
                </h2>
                <p className="text-foreground-muted text-base md:text-lg font-medium mb-6 max-w-xl mx-auto">
                    Watch how GitPulse answers questions, generates architecture diagrams, and runs security checks — try the arrows or dots to switch scenarios.
                </p>
                <div className="flex items-center justify-center gap-6 mb-4">
                    <button
                        onClick={() => handleManualSwitch('prev')}
                        className="p-1.5 hover:bg-[#F9C79A] rounded-full text-gray-600 hover:text-gray-900 transition-colors border-2 border-transparent hover:border-black"
                        aria-label="Previous scenario"
                        suppressHydrationWarning
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                        {scenarios.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setScenarioIndex(idx);
                                    setStep(0);
                                    setPlaybackKey(k => k + 1);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-500 ${idx === scenarioIndex ? "w-8 bg-[#F9C79A]" : "w-3 bg-gray-400 hover:bg-gray-500"}`}
                                aria-label={`Go to scenario ${idx + 1}`}
                                suppressHydrationWarning
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => handleManualSwitch('next')}
                        className="p-1.5 hover:bg-[#F9C79A] rounded-full text-gray-600 hover:text-gray-900 transition-colors border-2 border-transparent hover:border-black"
                        aria-label="Next scenario"
                        suppressHydrationWarning
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-foreground-muted text-base md:text-lg font-medium">
                    Whether chatting, visualizing, or auditing, GitPulse handles it all.
                </p>
            </div>

            <div className="w-full relative rounded-xl overflow-hidden bg-[#FEF9F2] border-2 border-gray-200 shadow-[8px_8px_0px_rgba(0,0,0,0.08)] min-h-[380px] flex flex-col">
                {/* macOS window top bar */}
                <div className="flex items-center px-3 py-2 bg-white border-b-2 border-gray-200 transition-colors duration-500">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-400/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                        <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="mx-auto flex items-center space-x-2 text-xs text-gray-600 font-medium">
                        <Terminal className="w-3 h-3" />
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={currentScenario.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                {currentScenario.title}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 md:p-6 space-y-4 min-h-[340px] flex-1 overflow-hidden flex flex-col">
                    {/* User Query Bubble */}
                    <div className="flex gap-4 items-start w-full">
                        <div className="p-2 bg-[#F9C79A] rounded-lg shrink-0 border-2 border-gray-200 overflow-hidden">
                            <Image src="/user-avatar.png" alt="User" width={24} height={24} className="w-6 h-6 rounded-sm object-cover" />
                        </div>
                        <div className="bg-[#F9C79A] border-2 border-gray-800 p-4 rounded-xl rounded-tl-none w-full text-gray-900 font-mono text-sm shadow-sm relative">
                            <div className="relative w-full">
                                <TypewriterText text={currentScenario.query} step={visibleStep} />
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* AI Status / Thinking state */}
                        {visibleStep >= 2 && visibleStep <= 3 && (
                            <motion.div
                                key={`status-${currentScenario.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-3 text-sm text-gray-600 italic pl-14"
                            >
                                <motion.div>
                                    <BrainCircuit className="w-4 h-4 text-amber-500" />
                                </motion.div>
                                <span>{visibleStep === 2 ? currentScenario.loadingText : currentScenario.analyzingText}</span>
                            </motion.div>
                        )}

                        {/* Static preview when idle so the section never looks empty */}
                        {visibleStep < 2 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-4 items-start w-full opacity-70"
                            >
                                <div className="p-1 bg-[#FEF9F2] rounded-lg shrink-0 border-2 border-gray-200 overflow-hidden flex items-center justify-center w-10 h-10">
                                    <CodeIcon className="w-8 h-8" />
                                </div>
                                <div className="flex-1 bg-white border-2 border-gray-200 p-5 rounded-2xl rounded-tl-none text-gray-600 text-sm">
                                    <p>Ask a question above — the demo will run automatically when you scroll here.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* AI Response Box */}
                        {visibleStep >= 4 && (
                            <motion.div
                                key={`response-${currentScenario.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex gap-4 items-start w-full"
                            >
                                <div className="p-1 bg-[#FEF9F2] rounded-lg shrink-0 border-2 border-gray-200 overflow-hidden flex items-center justify-center w-10 h-10">
                                    <CodeIcon className="w-8 h-8" />
                                </div>

                                <div className="flex-1 space-y-4">
                                    {/* Referenced Files tags */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex flex-wrap gap-2 mb-2"
                                    >
                                        {currentScenario.tags.map((tag, i) => {
                                            const TagIcon = tag.icon;
                                            return (
                                                <span key={i} className="flex items-center gap-1.5 text-xs bg-[#FEF9F2] border-2 border-gray-200 text-gray-800 px-2 py-1 rounded-md font-medium">
                                                    <TagIcon className={`w-3 h-3 ${tag.color}`} />
                                                    {tag.text}
                                                </span>
                                            )
                                        })}
                                    </motion.div>

                                    <div className="bg-white border-2 border-gray-200 p-5 rounded-2xl rounded-tl-none w-full text-gray-800 shadow-sm relative overflow-hidden">
                                        {/* Dynamic accent line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${currentScenario.type === "chat" ? "bg-amber-400" :
                                            currentScenario.type === "architecture" ? "bg-blue-300" :
                                                "bg-red-300"
                                            }`} />

                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.8 }}
                                        >
                                            {renderResponse()}
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Glow Effects */}
                <div className={`absolute top-1/2 left-1/4 w-32 h-32 blur-[60px] rounded-full pointer-events-none transition-colors duration-1000 ${currentScenario.type === "chat" ? "bg-blue-500/10" :
                    currentScenario.type === "architecture" ? "bg-purple-500/10" :
                        "bg-red-500/10"
                    }`} />
                <div className={`absolute bottom-1/4 right-1/4 w-32 h-32 blur-[60px] rounded-full pointer-events-none transition-colors duration-1000 ${currentScenario.type === "chat" ? "bg-purple-500/10" :
                    currentScenario.type === "architecture" ? "bg-blue-500/10" :
                        "bg-orange-500/10"
                    }`} />
            </div>
        </section>
    );
}
