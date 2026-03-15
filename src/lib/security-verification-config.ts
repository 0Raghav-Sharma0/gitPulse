function envTrue(value: string | undefined, fallback: boolean): boolean {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
}

function envNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
}

export const SECURITY_VERIFICATION_FLAGS = {
    verificationGate: envTrue(process.env.SECURITY_VERIFICATION_GATE, true),
    verifiedOnlyReports: envTrue(process.env.SECURITY_VERIFIED_ONLY_REPORTS, true),
    autoClosureGate: envTrue(process.env.SECURITY_AUTO_CLOSURE_GATE, true),
    dependencyLiveAdvisory: envTrue(process.env.SECURITY_DEPENDENCY_LIVE_ADVISORY, true),
} as const;

export const SECURITY_VERIFICATION_THRESHOLDS = {
    autoVerified: envNumber(process.env.SECURITY_VERIFICATION_AUTO_THRESHOLD, 0.75),
    autoRejected: envNumber(process.env.SECURITY_VERIFICATION_REJECT_THRESHOLD, 0.45),
    benchmarkPrecision: envNumber(process.env.SECURITY_VERIFICATION_BENCH_PRECISION, 0.8),
    benchmarkRecall: envNumber(process.env.SECURITY_VERIFICATION_BENCH_RECALL, 0.75),
} as const;

export const SECURITY_CANARY_PERCENT = Math.min(
    100,
    Math.max(0, envNumber(process.env.SECURITY_VERIFIED_CANARY_PERCENT, 100))
);
