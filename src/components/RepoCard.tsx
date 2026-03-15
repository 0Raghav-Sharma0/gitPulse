"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Star, GitFork, Code } from "lucide-react";

interface RepoCardProps {
    name: string;
    owner: string;
    description?: string;
    stars?: number;
    forks?: number;
    language?: string;
}

export function RepoCard({ name, owner, description, stars, forks, language }: RepoCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 group"
        >
            <div className="relative bg-zinc-900 border border-white/10 rounded-xl p-5 hover:border-purple-600/50 transition-all duration-300">
                {/* Gradient glow on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />

                <div className="relative">
                    {/* Repo name */}
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Code className="w-5 h-5 text-purple-400" />
                        {owner}/{name}
                    </h3>

                    {/* Description */}
                    {description && (
                        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
                        {language && (
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                {language}
                            </span>
                        )}
                        {stars !== undefined && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {stars}
                            </span>
                        )}
                        {forks !== undefined && (
                            <span className="flex items-center gap-1">
                                <GitFork className="w-3 h-3" />
                                {forks}
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <Link
                            href={`/chat?q=${owner}/${name}`}
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
                        >
                            Analyze Repository
                        </Link>
                        <a
                            href={`https://github.com/${owner}/${name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
