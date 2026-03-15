import { X } from "lucide-react";

import { CopyBadge } from "@/components/CopyBadge";

interface BadgeModalProps {
    isOpen: boolean;
    owner: string;
    repo: string;
    onClose: () => void;
}

export function BadgeModal({ isOpen, owner, repo, onClose }: BadgeModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6 pr-8">Share your Analysis</h2>
                    <CopyBadge owner={owner} repo={repo} />
                </div>
            </div>
        </div>
    );
}
