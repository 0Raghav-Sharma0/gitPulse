"use client";

import Link from "next/link";
import type { ReportFalsePositiveReason } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import type { StoredScan } from "@/lib/services/scan-storage";
import type { PriorScanDiff, ReportFindingView } from "@/lib/services/report-service";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import {
    submitReportFalsePositive,
    trackReportConversion,
} from "@/app/actions";
import { DEEP_SCAN_PROMPT } from "@/lib/chat-constants";
import { CodeBlock } from "@/components/CodeBlock";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    Copy,
    Flame,
    Info,
    MessageCircle,
    Shield,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatReportCountdown, getReportExpiryState } from "@/app/report/report-expiry";
import ShareButton from "./ShareButton";
import { ExportButtons } from "./components/ExportButtons";

const severityConfig = {
    critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: Flame },
    high: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: AlertTriangle },
    medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertCircle },
    low: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Info },
    info: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", icon: CheckCircle },
} as const;

const confidenceConfig = {
    high: { label: "High Confidence", className: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
    medium: { label: "Medium Confidence", className: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10" },
    low: { label: "Low Confidence", className: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10" },
} as const;

const verificationConfig = {
    AUTO_VERIFIED_TRUE: { label: "Verified True", className: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
    OPEN: { label: "Open", className: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
    CLOSED: { label: "Closed", className: "text-zinc-300 border-zinc-600 bg-zinc-700/30" },
    AUTO_REJECTED_FALSE: { label: "Auto Rejected", className: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
    INCONCLUSIVE_HIDDEN: { label: "Inconclusive", className: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
    DETECTED: { label: "Detected", className: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10" },
} as const;

const exploitabilityConfig = {
    high: { label: "High Exploitability", className: "text-red-300 border-red-500/30 bg-red-500/10" },
    medium: { label: "Medium Exploitability", className: "text-orange-300 border-orange-500/30 bg-orange-500/10" },
    low: { label: "Low Exploitability", className: "text-blue-300 border-blue-500/30 bg-blue-500/10" },
    unknown: { label: "Unknown Exploitability", className: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10" },
} as const;

const evidenceTypeConfig = {
    source: { label: "Source", className: "border-blue-500/25 bg-blue-500/10 text-blue-100", iconClass: "text-blue-300" },
    sink: { label: "Sink", className: "border-red-500/25 bg-red-500/10 text-red-100", iconClass: "text-red-300" },
    sanitizer: { label: "Sanitizer", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100", iconClass: "text-emerald-300" },
    context: { label: "Context", className: "border-zinc-500/25 bg-zinc-500/10 text-zinc-100", iconClass: "text-zinc-300" },
} as const;

const traceTypeConfig = {
    source: { label: "Trace Source", className: "border-indigo-500/25 bg-indigo-500/10 text-indigo-100" },
    flow: { label: "Trace Flow", className: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100" },
    sink: { label: "Trace Sink", className: "border-rose-500/25 bg-rose-500/10 text-rose-100" },
} as const;

const falsePositiveReasonOptions: Array<{
    value: ReportFalsePositiveReason;
    label: string;
    description: string;
}> = [
    {
        value: "NOT_A_VULNERABILITY",
        label: "Not a vulnerability",
        description: "The finding is technically incorrect for this code path.",
    },
    {
        value: "TEST_OR_FIXTURE",
        label: "Test or fixture only",
        description: "The finding points to non-production code or seeded test data.",
    },
    {
        value: "FALSE_DATAFLOW",
        label: "False dataflow",
        description: "The scanner connected source and sink incorrectly.",
    },
    {
        value: "INTENDED_BEHAVIOR",
        label: "Intended behavior",
        description: "The flagged pattern is deliberate and already protected by surrounding controls.",
    },
    {
        value: "OTHER",
        label: "Other",
        description: "Use this when none of the standard categories fit.",
    },
];

function SeverityBadge({ severity }: { severity: keyof typeof severityConfig }) {
    const config = severityConfig[severity] || severityConfig.info;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} border ${config.border}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">{severity}</span>
        </span>
    );
}

function ConfidenceBadge({ confidence }: { confidence?: ReportFindingView["finding"]["confidence"] }) {
    if (!confidence) {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300">
                Confidence: Not Scored
            </span>
        );
    }

    const config = confidenceConfig[confidence];
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
            {config.label}
        </span>
    );
}

function VerificationBadge({ status }: { status?: ReportFindingView["finding"]["verificationStatus"] }) {
    if (!status) {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300">
                Legacy Finding
            </span>
        );
    }

    const config = verificationConfig[status] ?? verificationConfig.DETECTED;
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
            {config.label}
        </span>
    );
}

function clampScore(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function computeSecurityHealthScore(input: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    newFindings: number;
    resolvedFindings: number;
    exploitabilityHigh: number;
}): {
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    label: string;
    trend: "improving" | "stable" | "degrading";
} {
    const base = 100;
    const penalty =
        input.critical * 28 +
        input.high * 16 +
        input.medium * 8 +
        input.low * 3 +
        input.exploitabilityHigh * 4 +
        input.newFindings * 2;
    const recovery = input.resolvedFindings * 3;
    const score = clampScore(Math.round(base - penalty + recovery), 0, 100);

    const grade: "A" | "B" | "C" | "D" | "F" =
        score >= 90 ? "A" :
            score >= 80 ? "B" :
                score >= 65 ? "C" :
                    score >= 45 ? "D" : "F";

    const label =
        grade === "A" ? "Hardened posture" :
            grade === "B" ? "Strong posture" :
                grade === "C" ? "Needs improvement" :
                    grade === "D" ? "Elevated risk" : "Critical attention needed";

    const trendScore = input.resolvedFindings - input.newFindings;
    const trend: "improving" | "stable" | "degrading" =
        trendScore > 0 ? "improving" :
            trendScore < 0 ? "degrading" : "stable";

    return { score, grade, label, trend };
}

interface ReportContentProps {
    scan: StoredScan;
    priorScanDiff: PriorScanDiff;
    topFixes: ReportFindingView[];
    findingViews: ReportFindingView[];
    globalFixPrompt: string;
    globalChatHref: string;
    hasPreviousScan: boolean;
    isSharedView: boolean;
    canShareReport: boolean;
    canGenerateOutreach: boolean;
    shareMode: "canonical" | "copy-current-url";
    reportExpiresAt: number;
}

export function ReportContent({
    scan,
    priorScanDiff,
    topFixes,
    findingViews,
    globalFixPrompt,
    hasPreviousScan,
    isSharedView,
    canShareReport,
    canGenerateOutreach,
    shareMode,
    reportExpiresAt,
}: ReportContentProps) {
    const baseUrl = getCanonicalSiteUrl();
    const defaultReportUrl = `${baseUrl}/report/${scan.id}`;
    const date = new Date(scan.timestamp);
    const [now, setNow] = useState(() => Date.now());
    const [showFixPromptModal, setShowFixPromptModal] = useState(false);
    const [isCopyingFixPrompt, setIsCopyingFixPrompt] = useState(false);
    const [pendingFalsePositives, setPendingFalsePositives] = useState<Record<string, boolean>>({});
    const [activeFalsePositiveKey, setActiveFalsePositiveKey] = useState<string | null>(null);
    const [falsePositiveReason, setFalsePositiveReason] = useState<ReportFalsePositiveReason>("NOT_A_VULNERABILITY");
    const [falsePositiveDetails, setFalsePositiveDetails] = useState("");
    const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
    const [showDeepScanRepoModal, setShowDeepScanRepoModal] = useState(false);
    const [deepScanRepoInput, setDeepScanRepoInput] = useState("");
    const [shareableUrl, setShareableUrl] = useState(defaultReportUrl);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 60_000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && window.location.href) {
            setShareableUrl(window.location.href);
        }
    }, [defaultReportUrl]);

    const expiryState = useMemo(
        () => getReportExpiryState(reportExpiresAt, now),
        [reportExpiresAt, now]
    );
    const isOutdated = expiryState.isExpired;
    const expiryLabel = formatReportCountdown(reportExpiresAt, now);
    const repoChatHref = `/chat?q=${encodeURIComponent(`${scan.owner}/${scan.repo}`)}`;
    const repoProfileHref = `/repo/${scan.owner}/${scan.repo}`;

    const topFixesByFingerprint = useMemo(() => {
        const fpSet = new Set(topFixes.map((item) => item.fingerprint));
        return findingViews.filter((view) => fpSet.has(view.fingerprint)).slice(0, 3);
    }, [findingViews, topFixes]);
    const exploitabilityHighCount = useMemo(
        () => findingViews.filter((view) => view.finding.exploitabilityTag === "high").length,
        [findingViews]
    );
    const verifiedSeverityTotals = useMemo(() => {
        return findingViews.reduce(
            (acc, view) => {
                const severity = view.finding.severity;
                if (severity in acc) {
                    acc[severity as keyof typeof acc] += 1;
                }
                return acc;
            },
            { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
        );
    }, [findingViews]);
    const healthScore = useMemo(
        () => computeSecurityHealthScore({
            critical: verifiedSeverityTotals.critical,
            high: verifiedSeverityTotals.high,
            medium: verifiedSeverityTotals.medium,
            low: verifiedSeverityTotals.low,
            newFindings: priorScanDiff.new,
            resolvedFindings: priorScanDiff.resolved,
            exploitabilityHigh: exploitabilityHighCount,
        }),
        [
            exploitabilityHighCount,
            priorScanDiff.new,
            priorScanDiff.resolved,
            verifiedSeverityTotals.critical,
            verifiedSeverityTotals.high,
            verifiedSeverityTotals.low,
            verifiedSeverityTotals.medium,
        ]
    );
    const verifiedBadgeSnippet = useMemo(
        () =>
            `[![GitPulse Verified Security Scan](https://img.shields.io/badge/GitPulse-Verified%20Security%20Scan-22c55e?style=for-the-badge)](${shareableUrl})`,
        [shareableUrl]
    );
    const verifiedReportSnippet = useMemo(
        () =>
            `GitPulse verified security report for ${scan.owner}/${scan.repo}: ${verifiedSeverityTotals.critical} critical, ${verifiedSeverityTotals.high} high, ${verifiedSeverityTotals.medium} medium, ${verifiedSeverityTotals.low} low. Security Health Score ${healthScore.score}/100 (${healthScore.grade}). ${shareableUrl}`,
        [
            healthScore.grade,
            healthScore.score,
            scan.owner,
            scan.repo,
            shareableUrl,
            verifiedSeverityTotals.critical,
            verifiedSeverityTotals.high,
            verifiedSeverityTotals.low,
            verifiedSeverityTotals.medium,
        ]
    );

    const openFixPromptModal = () => {
        if (isOutdated || findingViews.length === 0) return;
        setShowFixPromptModal(true);
    };

    const closeFixPromptModal = () => {
        if (isCopyingFixPrompt) return;
        setShowFixPromptModal(false);
    };

    const handleCopyFixPrompt = async () => {
        if (isOutdated || findingViews.length === 0) return;

        setIsCopyingFixPrompt(true);
        try {
            await navigator.clipboard.writeText(globalFixPrompt);
            void trackReportConversion("report_fix_prompt_copied", scan.id);
            toast.success("Fix prompt copied. Paste it in Repo Chat to remediate vulnerabilities.");
            setShowFixPromptModal(false);
        } catch {
            toast.error("Failed to copy prompt");
        } finally {
            setIsCopyingFixPrompt(false);
        }
    };

    const activeFalsePositiveView = useMemo(() => {
        if (!activeFalsePositiveKey) return null;
        return findingViews.find((view) => `${view.fingerprint}:${view.index}` === activeFalsePositiveKey) ?? null;
    }, [activeFalsePositiveKey, findingViews]);
    const isActiveFalsePositivePending = activeFalsePositiveKey
        ? Boolean(pendingFalsePositives[activeFalsePositiveKey])
        : false;

    const closeFalsePositiveModal = () => {
        setActiveFalsePositiveKey(null);
        setFalsePositiveReason("NOT_A_VULNERABILITY");
        setFalsePositiveDetails("");
    };

    const openFalsePositiveModal = (view: ReportFindingView) => {
        setActiveFalsePositiveKey(`${view.fingerprint}:${view.index}`);
        setFalsePositiveReason("NOT_A_VULNERABILITY");
        setFalsePositiveDetails("");
    };

    const handleFalsePositiveSubmit = async () => {
        if (!activeFalsePositiveView) return;

        const key = `${activeFalsePositiveView.fingerprint}:${activeFalsePositiveView.index}`;
        setPendingFalsePositives((current) => ({ ...current, [key]: true }));

        try {
            await submitReportFalsePositive({
                scanId: scan.id,
                findingIndex: activeFalsePositiveView.index,
                findingFingerprint: activeFalsePositiveView.fingerprint,
                isSharedView,
                reason: falsePositiveReason,
                details: falsePositiveDetails,
            });
            toast.success("False positive submitted");
            closeFalsePositiveModal();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to submit false positive";
            toast.error(message);
        } finally {
            setPendingFalsePositives((current) => {
                const next = { ...current };
                delete next[key];
                return next;
            });
        }
    };

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

    const handleCopyVerifiedBadge = async () => {
        const copied = await tryCopyToClipboard(verifiedBadgeSnippet);
        if (!copied) {
            toast.error("Unable to access clipboard");
            return;
        }
        toast.success("Verified badge snippet copied");
    };

    const handleCopyVerifiedReportSnippet = async () => {
        const copied = await tryCopyToClipboard(verifiedReportSnippet);
        if (!copied) {
            toast.error("Unable to access clipboard");
            return;
        }
        toast.success("Report snippet copied");
    };

    const handleLaunchDeepScanAnotherRepo = () => {
        const normalized = deepScanRepoInput
            .trim()
            .replace(/^https?:\/\/github\.com\//i, "")
            .replace(/\/+$/, "")
            .replace(/\.git$/i, "");

        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
            toast.error("Use repository format owner/repo");
            return;
        }

        const href = `/chat?q=${encodeURIComponent(normalized)}&prompt=${encodeURIComponent(DEEP_SCAN_PROMPT)}`;
        setShowDeepScanRepoModal(false);
        setDeepScanRepoInput("");
        if (typeof window !== "undefined") {
            window.location.href = href;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] text-gray-900 p-4 md:p-8 selection:bg-amber-200/50">
            <div className="max-w-4xl mx-auto space-y-8">
                <div data-testid="report-actions-navbar" className="print:hidden">
                    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-xl md:hidden">
                        <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                                <Shield className="w-3.5 h-3.5" />
                                Report Actions
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsMobileActionsOpen((current) => !current)}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-100"
                                aria-expanded={isMobileActionsOpen}
                                aria-controls="report-actions-mobile-menu"
                            >
                                <ChevronDown className={`h-4 w-4 transition-transform ${isMobileActionsOpen ? "rotate-180" : ""}`} />
                                <span className="sr-only">{isMobileActionsOpen ? "Collapse report actions" : "Expand report actions"}</span>
                            </button>
                        </div>

                        {isMobileActionsOpen && (
                            <div id="report-actions-mobile-menu" className="mt-3 flex flex-col gap-2">
                                {isOutdated ? (
                                    <Link
                                        href={repoChatHref}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Rescan in Repo Chat
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={repoChatHref}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Talk to the Codebase
                                        </Link>
                                        {canShareReport && (
                                            <ShareButton
                                                scanId={scan.id}
                                                canGenerateOutreach={canGenerateOutreach}
                                                shareMode={shareMode}
                                                reportExpiresAt={reportExpiresAt}
                                            />
                                        )}
                                        <button
                                            onClick={openFixPromptModal}
                                            disabled={findingViews.length === 0}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Get LLM-Ready Fix Prompt
                                        </button>
                                        <button
                                            onClick={() => { void handleCopyVerifiedReportSnippet(); }}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-700"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copy Report Snippet
                                        </button>
                                        <button
                                            onClick={() => { void handleCopyVerifiedBadge(); }}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-700"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copy Verified Badge
                                        </button>
                                        <button
                                            onClick={() => setShowDeepScanRepoModal(true)}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-600/15 px-3.5 py-2 text-sm font-medium text-indigo-200 transition-all hover:bg-indigo-600/25"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Deep Scan Another Repo
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block sticky top-0 z-50 rounded-2xl border-2 border-gray-200 bg-white p-4 md:p-5 shadow-xl">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                                        <Shield className="w-3.5 h-3.5" />
                                        Report Actions
                                    </span>
                                    {isSharedView && (
                                        <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                                            Shared Link
                                        </span>
                                    )}
                                </div>
                                {isOutdated && (
                                    <Link
                                        href={repoChatHref}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Rescan in Repo Chat
                                    </Link>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {!isOutdated && (
                                    <Link
                                        href={repoChatHref}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Talk to the Codebase
                                    </Link>
                                )}
                                {!isOutdated && canShareReport && (
                                    <ShareButton
                                        scanId={scan.id}
                                        canGenerateOutreach={canGenerateOutreach}
                                        shareMode={shareMode}
                                        reportExpiresAt={reportExpiresAt}
                                    />
                                )}
                                {!isOutdated && (
                                    <button
                                        onClick={openFixPromptModal}
                                        disabled={findingViews.length === 0}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Get LLM-Ready Fix Prompt
                                    </button>
                                )}
                                {!isOutdated && (
                                    <button
                                        onClick={() => { void handleCopyVerifiedReportSnippet(); }}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-700"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Report Snippet
                                    </button>
                                )}
                                {!isOutdated && (
                                    <button
                                        onClick={() => { void handleCopyVerifiedBadge(); }}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-700"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Verified Badge
                                    </button>
                                )}
                                {!isOutdated && (
                                    <button
                                        onClick={() => setShowDeepScanRepoModal(true)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-600/15 px-3.5 py-2 text-sm font-medium text-indigo-200 transition-all hover:bg-indigo-600/25"
                                    >
                                        <Shield className="w-4 h-4" />
                                        Deep Scan Another Repo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border-2 border-gray-200 bg-[#FEF9F2] p-6 shadow-xl">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-amber-700">
                                <Shield className="w-5 h-5" />
                                <span className="text-sm font-medium tracking-wide uppercase">
                                    GITPULSE SECURITY REPORT
                                </span>
                            </div>
                            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
                                <span className="font-normal text-gray-500">{scan.owner} / </span>
                                {scan.repo}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                <span>Scanned on {date.toLocaleDateString()} at {date.toLocaleTimeString()}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                    {scan.depth === "deep" ? "Deep Analysis" : "Quick Scan"}
                                </span>
                                <span className={`rounded-md border px-2 py-0.5 text-xs ${isOutdated ? "border-red-500/20 bg-red-500/10 text-red-700" : "border-amber-500/20 bg-amber-500/10 text-amber-800"}`}>
                                    {isOutdated ? "Outdated" : `Expires in ${expiryLabel}`}
                                </span>
                            </div>
                        </div>
                        <div className="print:hidden flex flex-col gap-3 lg:items-end">
                            <Link
                                href={repoProfileHref}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-[#F9C79A] px-3.5 py-2 text-sm font-medium text-gray-900 transition-all hover:bg-amber-400"
                            >
                                <Shield className="w-4 h-4" />
                                Repository Profile
                            </Link>
                            <ExportButtons scan={scan} />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Security Health Score</h3>
                            <p className="mt-1 text-sm text-gray-600">
                                Posture score based on verified severity mix, high-exploitability signals, and scan trend.
                            </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            healthScore.trend === "improving"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                : healthScore.trend === "degrading"
                                    ? "border-red-500/30 bg-red-500/10 text-red-700"
                                    : "border-gray-300 bg-gray-100 text-gray-700"
                        }`}>
                            Trend: {healthScore.trend}
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wider text-amber-700">Score</p>
                            <div className="mt-2 flex items-baseline gap-2">
                                <p className="text-4xl font-bold text-gray-900">{healthScore.score}</p>
                                <p className="text-sm text-gray-600">/ 100</p>
                                <p className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                    Grade {healthScore.grade}
                                </p>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">{healthScore.label}</p>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                            <p className="text-xs uppercase tracking-wider text-red-600">Critical + High</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{verifiedSeverityTotals.critical + verifiedSeverityTotals.high}</p>
                        </div>
                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                            <p className="text-xs uppercase tracking-wider text-orange-600">High Exploitability</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{exploitabilityHighCount}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-medium text-gray-900">Shareable Verified Snippets</h3>
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                            For README, issues, and team updates
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => { void handleCopyVerifiedBadge(); }}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50"
                        >
                            <Copy className="w-4 h-4" />
                            Copy Verified Badge
                        </button>
                        <button
                            onClick={() => { void handleCopyVerifiedReportSnippet(); }}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50"
                        >
                            <Copy className="w-4 h-4" />
                            Copy Report Snippet
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Badge Markdown</p>
                            <pre className="overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800 whitespace-pre-wrap">
                                {verifiedBadgeSnippet}
                            </pre>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Report Summary Snippet</p>
                            <pre className="overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800 whitespace-pre-wrap">
                                {verifiedReportSnippet}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {(Object.keys(severityConfig) as Array<keyof typeof severityConfig>).map((sev) => {
                        const count = scan.summary[sev] || 0;
                        const config = severityConfig[sev];
                        const Icon = config.icon;

                        return (
                            <div key={sev} className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center ${count > 0 ? config.border : "border-white/5"} ${count > 0 ? config.bg : "bg-zinc-900/50"}`}>
                                <div className="mb-2 flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${count > 0 ? config.color : "text-zinc-600"}`} />
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${count > 0 ? config.color : "text-zinc-500"}`}>{sev}</span>
                                </div>
                                <span className={`text-3xl font-bold ${count > 0 ? "text-white" : "text-zinc-700"}`}>{count}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-medium text-gray-900">What Changed Since Last Scan</h3>
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                            {hasPreviousScan ? "Compared to previous scan" : "Baseline scan"}
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {hasPreviousScan
                            ? "Use this delta to prioritize newly introduced risk, then resolve historical findings."
                            : "No earlier scan found for this repository yet. This report is your baseline for future change tracking."}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                            <p className="text-xs uppercase tracking-wider text-red-700">New</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{priorScanDiff.new}</p>
                        </div>
                        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs uppercase tracking-wider text-emerald-700">Resolved</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{priorScanDiff.resolved}</p>
                        </div>
                        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs uppercase tracking-wider text-gray-700">Unchanged</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{priorScanDiff.unchanged}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-lg font-medium text-gray-900">Fix These First</h3>
                            <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                                Ranked by impact, confidence, and exploitability
                            </span>
                        </div>
                        {topFixesByFingerprint.length === 0 ? (
                            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                                No vulnerabilities to prioritize in this scan.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topFixesByFingerprint.map((view, rank) => (
                                    <div key={`${view.fingerprint}:${rank}`} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300">
                                                    Priority #{rank + 1}
                                                </span>
                                                <SeverityBadge severity={view.finding.severity as keyof typeof severityConfig} />
                                                <ConfidenceBadge confidence={view.finding.confidence} />
                                                <VerificationBadge status={view.finding.verificationStatus} />
                                            </div>
                                            <p className="text-sm font-medium text-zinc-100">{view.finding.title}</p>
                                            <p className="text-xs text-zinc-400">
                                                {view.finding.file}{view.finding.line ? `:${view.finding.line}` : ""} • Triage score {view.triageScore}
                                            </p>
                                            {view.finding.exploitabilityTag && (
                                                <p className="text-xs text-zinc-400">Exploitability: {view.finding.exploitabilityTag}</p>
                                            )}
                                            <p className="text-sm text-zinc-300">{view.impact}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <h3 className="border-b border-gray-200 pb-2 text-lg font-medium text-gray-900">
                        Detailed Findings ({findingViews.length})
                    </h3>

                    {findingViews.length === 0 ? (
                        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500 opacity-80" />
                            <h4 className="mb-1 font-medium text-gray-900">No vulnerabilities found</h4>
                            <p className="text-sm text-gray-600">This repository looks clean based on the scan configuration.</p>
                        </div>
                    ) : (
                        findingViews.map((view) => {
                            const key = `${view.fingerprint}:${view.index}`;
                            const exploitabilityTag = view.finding.exploitabilityTag ?? "unknown";
                            const exploitabilityBadge = exploitabilityConfig[exploitabilityTag];
                            const evidenceItems = (view.finding.evidence ?? []).slice(0, 6);
                            const verificationSignalItems = (view.finding.verificationSignals ?? []).slice(0, 6);
                            const traceItems = (view.finding.trace ?? []).slice(0, 6);
                            const hasStructuredEvidence =
                                evidenceItems.length > 0 || verificationSignalItems.length > 0 || traceItems.length > 0;

                            return (
                                <div key={key} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-lg" style={{ pageBreakInside: "avoid" }}>
                                    <div className="flex flex-col gap-4 border-b border-white/5 bg-zinc-950/50 p-5 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <SeverityBadge severity={view.finding.severity as keyof typeof severityConfig} />
                                                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-mono text-zinc-300">
                                                    {view.finding.type}
                                                </span>
                                                <ConfidenceBadge confidence={view.finding.confidence} />
                                                <VerificationBadge status={view.finding.verificationStatus} />
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${exploitabilityBadge.className}`}>
                                                    {exploitabilityBadge.label}
                                                </span>
                                                {(view.finding.cwe || view.finding.cvss) && (
                                                    <span className="flex items-center gap-2 text-xs text-zinc-500">
                                                        {view.finding.cwe && <span>{view.finding.cwe}</span>}
                                                        {view.finding.cvss && <span>CVSS: {view.finding.cvss}</span>}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-lg font-medium text-zinc-100">{view.finding.title}</h4>
                                        </div>
                                        <div className="print:hidden flex items-center gap-2">
                                            <button
                                                onClick={() => openFalsePositiveModal(view)}
                                                disabled={Boolean(pendingFalsePositives[key])}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                                {pendingFalsePositives[key] ? "Submitting..." : "False Positive"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6 p-5">
                                        <div className="space-y-3">
                                            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Evidence</h5>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {evidenceItems.map((evidence, evidenceIndex) => {
                                                    const style = evidenceTypeConfig[evidence.type] ?? evidenceTypeConfig.context;
                                                    return (
                                                        <div
                                                            key={`evidence:${key}:${evidenceIndex}`}
                                                            className={`rounded-xl border p-3 ${style.className}`}
                                                        >
                                                            <p className={`text-[11px] font-semibold uppercase tracking-wider ${style.iconClass}`}>
                                                                {style.label}
                                                            </p>
                                                            <p className="mt-2 text-sm leading-relaxed">
                                                                {evidence.message}
                                                            </p>
                                                            <p className="mt-2 text-xs text-zinc-300">
                                                                {typeof evidence.line === "number" ? `Line ${evidence.line}` : "Line not provided"}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                                {verificationSignalItems.map((signal, signalIndex) => (
                                                    <div
                                                        key={`signal:${key}:${signalIndex}`}
                                                        className={`rounded-xl border p-3 ${
                                                            signal.passed
                                                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                                                                : "border-amber-500/25 bg-amber-500/10 text-amber-100"
                                                        }`}
                                                    >
                                                        <p className="text-[11px] font-semibold uppercase tracking-wider">
                                                            Verifier Signal
                                                        </p>
                                                        <p className="mt-2 text-sm">
                                                            {signal.name}: {signal.passed ? "pass" : "fail"}
                                                        </p>
                                                        <p className="mt-2 text-xs text-zinc-200">
                                                            {signal.detail}
                                                        </p>
                                                    </div>
                                                ))}
                                                {traceItems.map((trace, traceIndex) => {
                                                    const style = traceTypeConfig[trace.type] ?? traceTypeConfig.flow;
                                                    return (
                                                        <div
                                                            key={`trace:${key}:${traceIndex}`}
                                                            className={`rounded-xl border p-3 ${style.className}`}
                                                        >
                                                            <p className="text-[11px] font-semibold uppercase tracking-wider">
                                                                {style.label}
                                                            </p>
                                                            <p className="mt-2 text-sm">
                                                                {trace.detail}
                                                            </p>
                                                            <p className="mt-2 text-xs text-zinc-300">
                                                                {typeof trace.line === "number" ? `Line ${trace.line}` : "Line not provided"}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                                {!hasStructuredEvidence && (
                                                    <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-300 md:col-span-2">
                                                        No structured evidence cards were generated for this finding. See proof summary below.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2 rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                                                <h6 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Proof Summary</h6>
                                                <pre className="whitespace-pre-wrap text-sm text-zinc-300">{view.proof}</pre>
                                            </div>
                                            <p className="text-xs text-zinc-500">{view.confidenceRationale}</p>
                                            {view.finding.verificationRationale && (
                                                <p className="text-xs text-zinc-500">
                                                    Verification: {view.finding.verificationRationale}
                                                </p>
                                            )}
                                            {view.finding.exploitabilityTag && (
                                                <p className="text-xs text-zinc-500">
                                                    Exploitability tag: {view.finding.exploitabilityTag}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Impact</h5>
                                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                                                {view.impact}
                                            </div>
                                        </div>

                                        <div className="flex flex-col space-y-2">
                                            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recommendation</h5>
                                            <div className="rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-4">
                                                <p className="text-sm text-indigo-200">{view.finding.recommendation}</p>
                                            </div>
                                        </div>

                                        {view.finding.snippet && (
                                            <div className="space-y-2 pt-2">
                                                <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Context Snippet</h5>
                                                <CodeBlock
                                                    language={view.finding.file.split(".").pop() || "text"}
                                                    value={view.finding.snippet}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="no-export pt-8 text-center text-sm text-zinc-600">
                    <p>Generated by <a href={baseUrl} className="font-semibold text-zinc-500 transition-colors hover:text-indigo-400">GitPulse</a> — The AI developer sidekick.</p>
                </div>
            </div>

            {showFixPromptModal && (
                <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={closeFixPromptModal}
                    />
                    <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
                        <div className="space-y-4 p-6">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                                    <Copy className="w-3.5 h-3.5" />
                                    LLM-Ready Prompt
                                </div>
                                <h3 className="text-xl font-semibold text-white">Preview Fix Prompt</h3>
                                <p className="text-sm text-zinc-400">
                                    Review the remediation prompt, then copy it to continue fixing vulnerabilities in chat.
                                </p>
                            </div>

                            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-200">
                                {globalFixPrompt}
                            </pre>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeFixPromptModal}
                                    disabled={isCopyingFixPrompt}
                                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleCopyFixPrompt();
                                    }}
                                    disabled={isCopyingFixPrompt}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Copy className="w-4 h-4" />
                                    {isCopyingFixPrompt ? "Copying..." : "Copy Prompt"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDeepScanRepoModal && (
                <div className="fixed inset-0 z-115 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => {
                            setShowDeepScanRepoModal(false);
                            setDeepScanRepoInput("");
                        }}
                    />
                    <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleLaunchDeepScanAnotherRepo();
                            }}
                            className="space-y-5 p-6"
                        >
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                                    <Shield className="w-3.5 h-3.5" />
                                    Deep Scan
                                </div>
                                <h3 className="text-xl font-semibold text-white">Scan Another Repository</h3>
                                <p className="text-sm text-zinc-400">
                                    Enter any GitHub repository and launch a deep verified scan flow in chat.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="deep-scan-repo" className="text-sm font-medium text-zinc-200">
                                    Repository
                                </label>
                                <input
                                    id="deep-scan-repo"
                                    value={deepScanRepoInput}
                                    onChange={(event) => setDeepScanRepoInput(event.target.value)}
                                    placeholder="owner/repo or https://github.com/owner/repo"
                                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none"
                                    autoFocus
                                />
                                <p className="text-xs text-zinc-500">
                                    We normalize GitHub URLs automatically and start the deep scan prompt for that repository.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Try examples</p>
                                <div className="flex flex-wrap gap-2">
                                    {["vercel/next.js", "supabase/supabase", "langchain-ai/langchainjs"].map((exampleRepo) => (
                                        <button
                                            key={exampleRepo}
                                            type="button"
                                            onClick={() => setDeepScanRepoInput(exampleRepo)}
                                            className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                                        >
                                            {exampleRepo}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeepScanRepoModal(false);
                                        setDeepScanRepoInput("");
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deepScanRepoInput.trim().length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Shield className="w-4 h-4" />
                                    Launch Deep Scan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeFalsePositiveView && (
                <div className="fixed inset-0 z-120 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => {
                            if (!isActiveFalsePositivePending) {
                                closeFalsePositiveModal();
                            }
                        }}
                    />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void handleFalsePositiveSubmit();
                            }}
                            className="space-y-5 p-6"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-amber-300">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">False Positive Report</span>
                                </div>
                                <h3 className="text-xl font-semibold text-white">{activeFalsePositiveView.finding.title}</h3>
                                <p className="text-sm text-zinc-400">
                                    {activeFalsePositiveView.finding.file}
                                    {activeFalsePositiveView.finding.line ? `:${activeFalsePositiveView.finding.line}` : ""}
                                    {" • "}
                                    {activeFalsePositiveView.finding.severity.toUpperCase()}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="false-positive-reason" className="text-sm font-medium text-zinc-200">
                                    Why is this a false positive?
                                </label>
                                <select
                                    id="false-positive-reason"
                                    value={falsePositiveReason}
                                    onChange={(event) => setFalsePositiveReason(event.target.value as ReportFalsePositiveReason)}
                                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none"
                                >
                                    {falsePositiveReasonOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-zinc-500">
                                    {falsePositiveReasonOptions.find((option) => option.value === falsePositiveReason)?.description}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="false-positive-details" className="text-sm font-medium text-zinc-200">
                                    Full details
                                </label>
                                <textarea
                                    id="false-positive-details"
                                    value={falsePositiveDetails}
                                    onChange={(event) => setFalsePositiveDetails(event.target.value)}
                                    rows={5}
                                    placeholder="Explain why this finding is incorrect, what controls already exist, and anything the reviewer should verify."
                                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none"
                                />
                                <p className="text-xs text-zinc-500">
                                    Include enough context for review. This field is required.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeFalsePositiveModal}
                                    disabled={isActiveFalsePositivePending}
                                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isActiveFalsePositivePending || falsePositiveDetails.trim().length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <ShieldAlert className="w-4 h-4" />
                                    {isActiveFalsePositivePending ? "Submitting..." : "Submit False Positive"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
