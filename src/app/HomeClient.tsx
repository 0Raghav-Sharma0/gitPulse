"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Code2, MessageSquare, Shield } from "lucide-react";
import { fetchGitHubData } from "./actions";
import InteractiveDemo from "@/components/InteractiveDemo";
import BentoFeatures from "@/components/BentoFeatures";
import CAGComparison from "@/components/CAGComparison";
import Image from "next/image";
import CodeIcon from "@/components/CodeIcon";
import { InstallPWA } from "@/components/InstallPWA";
import AuthButton from "@/components/AuthButton";
import { INVALID_SESSION_ERROR_PARAM } from "@/lib/session-guard";
import { BlogPost } from "@prisma/client";

export default function HomeClient({ initialPosts = [] }: { initialPosts?: BlogPost[] }) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    useSession();
    const hasInvalidSessionError = searchParams.get("error") === INVALID_SESSION_ERROR_PARAM;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);
        setError("");

        try {
            const result = await fetchGitHubData(input);

            if (result.error) {
                setError(result.error);
            } else {
                router.push(`/chat?q=${encodeURIComponent(input)}`);
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex flex-col min-h-screen text-gray-800 overflow-x-hidden relative">
            <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-black">
                <div className="max-w-5xl mx-auto px-3 md:px-4 py-2 flex justify-between items-center gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#FEF9F2] border border-black font-display font-bold text-sm md:text-base tracking-tight text-foreground hover:text-amber-600 transition-colors shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                    >
                        GitPulse
                    </Link>
                    <AuthButton />
                </div>
            </header>

            <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] max-w-[500px] h-[80vw] max-h-[500px] bg-[#F9C79A] rounded-full blur-[80px] md:blur-[128px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] max-w-[500px] h-[80vw] max-h-[500px] bg-amber-200 rounded-full blur-[80px] md:blur-[128px]" />
            </div>

            <section className="flex flex-col items-center justify-center py-12 md:py-16 px-4 relative overflow-hidden z-10">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="z-10 flex flex-col items-center text-center max-w-xl w-full px-4"
                >
                    <div className="mb-5 conic-border-container rounded-full flex items-center justify-center">
                        <CodeIcon className="w-20 h-20 md:w-24 md:h-24" />
                    </div>

                    <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground relative w-fit mx-auto leading-tight">
                        Dive into Open Source.
                    </h1>
                    <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mt-1 pb-2 relative w-fit mx-auto leading-tight">
                        <span className="text-foreground">Master </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-red-500">Any Repo. Instantly.</span>
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-foreground-muted mt-6 mb-6 max-w-xl mx-auto font-medium leading-relaxed">
                        Transform any GitHub repository into an <span className="font-bold text-foreground">AI-powered guide</span> for newcomers and seasoned developers alike. Get structured insights, understand code, and contribute with confidence.
                    </p>

                    {hasInvalidSessionError && (
                        <div className="w-full max-w-md mb-6 rounded-xl border-2 border-black bg-[#FEF9F2] px-4 py-3 text-sm text-gray-800">
                            Your session could not be validated. Please sign in again.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="w-full max-w-md relative group">
                        <div className="flex items-center bg-white border-2 border-black p-1 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="username or username/repo"
                                className="flex-1 bg-transparent border-none outline-none text-gray-900 px-3 py-2 md:px-4 md:py-3 placeholder-gray-500 text-sm md:text-base w-full min-w-0"
                                suppressHydrationWarning
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#F9C79A] text-black font-bold p-2 md:p-3 rounded-md border-2 border-black hover:bg-amber-400 transition-colors disabled:opacity-50 shrink-0 shadow-[3px_3px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                                suppressHydrationWarning
                            >
                                {loading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 text-red-600 text-sm font-medium"
                        >
                            {error}
                        </motion.p>
                    )}

                    <div className="mt-8 flex flex-wrap justify-center gap-5 md:gap-8 text-gray-700">
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                            <span className="w-8 h-8 rounded-lg bg-[#FEF9F2] border-2 border-black flex items-center justify-center">
                                <Code2 className="w-4 h-4 text-gray-800" />
                            </span>
                            Deep analysis
                        </span>
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                            <span className="w-8 h-8 rounded-lg bg-[#FEF9F2] border-2 border-black flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-gray-800" />
                            </span>
                            Chat with any repo
                        </span>
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                            <span className="w-8 h-8 rounded-lg bg-[#FEF9F2] border-2 border-black flex items-center justify-center">
                                <Shield className="w-4 h-4 text-gray-800" />
                            </span>
                            Security scans
                        </span>
                    </div>
                </motion.div>
            </section>

            <InteractiveDemo />

            <div className="relative z-10 w-full bg-white/50 backdrop-blur-sm border-y-2 border-black">
                <CAGComparison />
            </div>

            <div className="relative z-10 w-full bg-white/50 backdrop-blur-sm border-b-2 border-black">
                <BentoFeatures />
            </div>

            {initialPosts.length > 0 && (
                <section className="relative z-10 w-full py-14 md:py-16 px-6 border-b-2 border-black">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                            <div>
                                <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-4 text-foreground">
                                    Engineering <span className="bg-gradient-to-r from-[#F7AD33] to-[#ED474A] bg-clip-text text-transparent">Insights</span>
                                </h2>
                                <p className="text-foreground-muted text-lg max-w-2xl font-medium">
                                    Latest updates from the lab on AI-driven code intelligence and security.
                                </p>
                            </div>
                            <Link 
                                href="/blog" 
                                className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-amber-600 transition-colors group px-4 py-2 rounded-xl bg-[#FEF9F2] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                            >
                                View all insights <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {initialPosts.map((post) => (
                                <Link 
                                    key={post.slug} 
                                    href={`/blog/${post.slug}`}
                                    className="group flex flex-col h-full bg-[#FEF9F2] border-2 border-black rounded-xl p-5 hover:bg-amber-50/80 transition-all shadow-[8px_8px_0px_rgba(0,0,0,0.1)]"
                                >
                                    <div className="relative aspect-video rounded-xl overflow-hidden mb-5 border-2 border-black">
                                        <Image 
                                            src={post.image} 
                                            alt={post.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-2 py-0.5 rounded-full bg-[#F9C79A] text-gray-900 text-[10px] font-bold border-2 border-black uppercase">
                                            {post.category}
                                        </span>
                                        <span className="text-gray-600 text-[10px] uppercase font-bold tracking-tighter">
                                            {post.date}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm italic line-clamp-2 mb-6">
                                        {post.excerpt}
                                    </p>
                                    <div className="mt-auto pt-4 border-t-2 border-black flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700">Read insight</span>
                                        <ArrowRight size={14} className="text-gray-600 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "GitPulse",
                        "applicationCategory": "DeveloperApplication",
                        "operatingSystem": "Web",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD",
                        },
                        "description": "GitPulse is an AI-powered platform for codebase mastery, enabling developers to analyze, visualize, and chat with any GitHub repository or profile instantly.",
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "ratingCount": "120",
                        },
                    }),
                }}
            />
            <InstallPWA />
        </main>
    );
}
