"use client";

import { useState } from "react";
import { WhatsNewModal } from "./WhatsNewModal";

export function WhatsNewBadge() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="hover:scale-105 transition-transform group relative"
            >
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full backdrop-blur-sm group-hover:border-blue-500/40 transition-colors">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-blue-400 tracking-wider">v2.0</span>
                </div>
            </button>

            <WhatsNewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
