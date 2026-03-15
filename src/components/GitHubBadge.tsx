"use client";

import { useEffect, useState } from "react";

import { Github, Star } from "lucide-react";
import { fetchRepoDetails } from "@/app/actions";

interface RepoWithStars {
    stargazers_count: number;
}

function isRepoWithStars(data: unknown): data is RepoWithStars {
    return Boolean(
        data &&
        typeof data === "object" &&
        "stargazers_count" in data &&
        typeof (data as { stargazers_count?: unknown }).stargazers_count === "number"
    );
}

export function GitHubBadge() {
    const [stars, setStars] = useState<number | null>(null);

    const repoOwner = typeof process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER === "string" ? process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER : null;
    const repoName = typeof process.env.NEXT_PUBLIC_GITHUB_REPO_NAME === "string" ? process.env.NEXT_PUBLIC_GITHUB_REPO_NAME : null;
    const repoHref = repoOwner && repoName ? `https://github.com/${repoOwner}/${repoName}` : "#";

    useEffect(() => {
        if (!repoOwner || !repoName) return;
        const getStars = async () => {
            try {
                const data = await fetchRepoDetails(repoOwner, repoName);
                if (isRepoWithStars(data)) {
                    setStars(data.stargazers_count);
                }
            } catch (e) {
                console.error("Failed to fetch repo stars", e);
            }
        };
        getStars();
    }, [repoOwner, repoName]);

    return (
        <a
            href={repoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-105 transition-transform cursor-pointer block"
        >
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-lg hover:bg-[#F9C79A] transition-colors text-gray-900 font-semibold shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <Github className="w-5 h-5 md:w-4 md:h-4 text-gray-900" />
                <span className="hidden md:inline text-sm">Star on GitHub</span>
                {stars !== null ? (
                    <div className="hidden md:flex items-center gap-1.5 pl-2 border-l-2 border-black ml-1 text-gray-700">
                        <span className="text-xs font-mono">{stars.toLocaleString()}</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </div>
                ) : (
                    <div className="hidden md:flex items-center gap-1.5 pl-2 border-l-2 border-black ml-1 animate-pulse">
                        <div className="w-8 h-3 bg-gray-300 rounded mx-1" />
                        <Star className="w-3 h-3 text-gray-400 fill-gray-400" />
                    </div>
                )}
            </div>
        </a>
    );
}
