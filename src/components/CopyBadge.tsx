'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Copy, Check, Code2 } from 'lucide-react';
import { getCanonicalSiteUrl } from '@/lib/site-url';

interface CopyBadgeProps {
    owner: string;
    repo: string;
}

export function CopyBadge({ owner, repo }: CopyBadgeProps) {
    const [copied, setCopied] = useState(false);

    const baseUrl = getCanonicalSiteUrl();
    const markdownSnippet = `[![Analyzed by GitPulse](https://img.shields.io/badge/Analyzed%20by-GitPulse-4F46E5?style=for-the-badge)](${baseUrl}/repo/${owner}/${repo})`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(markdownSnippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-6 bg-[#FEF9F2] border-2 border-black/5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] rounded-2xl w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg border border-purple-200">
                        <Code2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Embed this Badge</h3>
                        <p className="text-xs text-gray-600 mt-0.5">Showcase GitPulse&apos;s analysis directly in your repository&apos;s README.</p>
                    </div>
                </div>
                <button
                    onClick={handleCopy}
                    className="group relative flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-900 transition-all bg-white/80 border border-black/5 hover:bg-purple-600 hover:text-white rounded-lg overflow-hidden shrink-0 shadow-sm"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-purple-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 text-green-400 relative z-10" />
                            <span className="text-green-400 relative z-10">Copied to Clipboard!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors relative z-10" />
                            <span className="relative z-10">Copy Markdown</span>
                        </>
                    )}
                </button>
            </div>

            <div className="relative group mt-2">
                <div className="absolute inset-0 bg-linear-to-r from-purple-500/10 to-blue-500/10 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-4 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-lg font-mono text-xs break-all select-all shadow-inner">
                    {markdownSnippet}
                </div>
            </div>

            <div className="flex items-center gap-4 mt-1 bg-white/70 p-3 rounded-lg border border-black/5">
                <span className="text-gray-600 uppercase tracking-wider text-xs font-semibold">Preview:</span>
                <a href={`${baseUrl}/repo/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="block transform hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(79,70,229,0.2)] hover:drop-shadow-[0_0_16px_rgba(79,70,229,0.4)]">
                    <Image
                        src="https://img.shields.io/badge/Analyzed%20by-GitPulse-4F46E5?style=for-the-badge"
                        alt="Analyzed by GitPulse"
                        width={154}
                        height={28}
                        className="h-7"
                        unoptimized
                    />
                </a>
            </div>
        </div>
    );
}
