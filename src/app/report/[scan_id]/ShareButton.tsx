"use client";

import { useMemo, useState } from "react";
import { Copy, Megaphone, Share2 } from "lucide-react";
import { toast } from "sonner";
import { createScanShareLink, generateOutreachPack } from "@/app/actions";

interface ShareButtonProps {
    scanId: string;
    canGenerateOutreach: boolean;
    shareMode: "canonical" | "copy-current-url";
    reportExpiresAt: number;
}

export default function ShareButton({
    scanId,
    canGenerateOutreach,
    shareMode,
    reportExpiresAt,
}: ShareButtonProps) {
    const [activeLink, setActiveLink] = useState<{ url: string; expiresAt: string } | null>(null);
    const [latestOutreachMessage, setLatestOutreachMessage] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);

    const expiryLabel = useMemo(
        () => new Date(reportExpiresAt).toLocaleDateString(),
        [reportExpiresAt]
    );

    const tryCopyToClipboard = async (value: string): Promise<boolean> => {
        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
            return false;
        }

        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            return false;
        }
    };

    const copyCurrentUrl = async () => {
        const currentUrl = window.location.href;
        const copied = await tryCopyToClipboard(currentUrl);
        setActiveLink({
            url: currentUrl,
            expiresAt: new Date(reportExpiresAt).toISOString(),
        });

        if (copied) {
            toast.success("Report link copied", {
                description: `Report expires on ${expiryLabel}.`,
            });
            return;
        }

        toast.success("Report link ready", {
            description: "Clipboard access is blocked. Use Copy Link to copy manually.",
        });
    };

    const handleShare = async () => {
        if (shareMode === "copy-current-url") {
            await copyCurrentUrl();
            return;
        }

        try {
            setIsSharing(true);
            const link = await createScanShareLink(scanId);
            setActiveLink({
                url: link.url,
                expiresAt: link.expiresAt,
            });
            const copied = await tryCopyToClipboard(link.url);

            if (copied) {
                toast.success("Report link copied", {
                    description: `Report expires on ${new Date(link.expiresAt).toLocaleDateString()}.`,
                });
            } else {
                toast.success("Report link ready", {
                    description: "Clipboard access is blocked. Use Copy Link to copy manually.",
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create share link";
            toast.error("Failed to share report", { description: message });
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopyOutreachPack = async () => {
        try {
            setIsGeneratingOutreach(true);
            const outreach = await generateOutreachPack(scanId);
            setLatestOutreachMessage(outreach.outreachMessage);
            setActiveLink({
                url: outreach.shareUrl,
                expiresAt: outreach.expiresAt,
            });

            const copied = await tryCopyToClipboard(outreach.outreachMessage);
            if (copied) {
                toast.success("Outreach pack copied", {
                    description: "Includes maintainer note, impact, signed report URL, and fix-chat CTA.",
                });
            } else {
                toast.success("Outreach pack generated", {
                    description: "Clipboard access is blocked. Use Copy Outreach to copy manually.",
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to generate outreach pack";
            toast.error("Failed to generate outreach pack", { description: message });
        } finally {
            setIsGeneratingOutreach(false);
        }
    };

    const handleCopyActiveLink = async () => {
        if (!activeLink) return;
        const copied = await tryCopyToClipboard(activeLink.url);
        if (!copied) {
            toast.error("Unable to access clipboard");
            return;
        }
        toast.success("Report link copied");
    };

    const handleCopyLatestOutreach = async () => {
        if (!latestOutreachMessage) return;
        const copied = await tryCopyToClipboard(latestOutreachMessage);
        if (!copied) {
            toast.error("Unable to access clipboard");
            return;
        }
        toast.success("Outreach pack copied");
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-60"
                title={`Report expires on ${expiryLabel}`}
            >
                <Share2 className="w-4 h-4" />
                {isSharing ? "Sharing..." : "Share Report"}
            </button>
            {canGenerateOutreach && (
                <button
                    onClick={handleCopyOutreachPack}
                    disabled={isGeneratingOutreach}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all border border-white/10 disabled:opacity-60"
                >
                    <Megaphone className="w-4 h-4" />
                    {isGeneratingOutreach ? "Building..." : "Outreach Pack"}
                </button>
            )}
            {activeLink && (
                <button
                    onClick={handleCopyActiveLink}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all border border-white/10"
                    title={`Copy report link (expires on ${new Date(activeLink.expiresAt).toLocaleDateString()})`}
                >
                    <Copy className="w-4 h-4" />
                    Copy Link
                </button>
            )}
            {latestOutreachMessage && (
                <button
                    onClick={handleCopyLatestOutreach}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all border border-white/10"
                    title="Copy latest outreach pack text"
                >
                    <Copy className="w-4 h-4" />
                    Copy Outreach
                </button>
            )}
            {activeLink && (
                <span className="text-xs text-zinc-400 border border-white/10 rounded-full px-2.5 py-1">
                    Expires on {new Date(activeLink.expiresAt).toLocaleDateString()}
                </span>
            )}
        </div>
    );
}
