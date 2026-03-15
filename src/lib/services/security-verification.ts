import { createHash } from "node:crypto";

import { kv } from "@vercel/kv";

import {
    adjudicateSecurityFindingWithGemini,
    type SecurityAdjudicationInput,
    type SecurityAdjudicationResult,
} from "@/lib/gemini-security";
import type {
    SecurityFinding,
    SecurityVerificationSignal,
    SecurityVerificationStatus,
} from "@/lib/security-scanner";
import {
    SECURITY_CANARY_PERCENT,
    SECURITY_VERIFICATION_FLAGS,
    SECURITY_VERIFICATION_THRESHOLDS,
} from "@/lib/security-verification-config";
import { resolveDependencyAdvisory } from "@/lib/services/dependency-advisory";
import { findingFingerprint as buildFindingFingerprint } from "@/lib/services/report-service";

export interface VerificationRepositoryFile {
    path: string;
    content: string;
}

export interface VerifyDetectedFindingsParams {
    scanId: string;
    owner: string;
    repo: string;
    findings: SecurityFinding[];
    repositoryFiles?: VerificationRepositoryFile[];
    enableAiAdjudication?: boolean;
    adjudicateFinding?: (input: SecurityAdjudicationInput) => Promise<SecurityAdjudicationResult>;
}

export interface FindingVerificationRecord {
    findingFingerprint: string;
    findingIndex: number;
    verificationStatus: SecurityVerificationStatus;
    lifecycleStatus: SecurityVerificationStatus;
    gateDecision: "include" | "exclude";
    verificationScore: number;
    verificationSignals: SecurityVerificationSignal[];
    verificationRationale: string;
    exploitabilityTag: SecurityFinding["exploitabilityTag"];
    finding: SecurityFinding;
}

export interface VerifierStats {
    detected: number;
    verifiedTrue: number;
    rejectedFalse: number;
    inconclusiveHidden: number;
    canaryApplied: boolean;
    verificationGateEnabled: boolean;
    verifiedOnlyReportsEnabled: boolean;
}

export interface VerifyDetectedFindingsResult {
    verifiedFindings: SecurityFinding[];
    hiddenFindings: SecurityFinding[];
    rejectedFindings: SecurityFinding[];
    records: FindingVerificationRecord[];
    stats: VerifierStats;
}

function clampScore(score: number): number {
    return Math.max(0, Math.min(1, score));
}

function hasEvidenceType(finding: SecurityFinding, type: "source" | "sink" | "sanitizer" | "context"): boolean {
    return Array.isArray(finding.evidence) && finding.evidence.some((signal) => signal.type === type);
}

function textForFinding(finding: SecurityFinding): string {
    return [
        finding.title,
        finding.description,
        finding.recommendation,
        finding.file,
        finding.cwe ?? "",
        finding.snippet ?? "",
    ].join(" ").toLowerCase();
}

function hasSanitizerHint(finding: SecurityFinding): boolean {
    const text = textForFinding(finding);
    return (
        hasEvidenceType(finding, "sanitizer") ||
        /(sanitize|sanitiz|escape|allowlist|whitelist|parameterized|prepared statement|validator|schema|zod|joi)/i.test(text)
    );
}

function hasInputSourceHint(finding: SecurityFinding): boolean {
    const text = textForFinding(finding);
    return /req\.|request\.|params\.|query\.|body\.|input|tainted|user/.test(text);
}

function inferExploitabilityTag(finding: SecurityFinding): SecurityFinding["exploitabilityTag"] {
    const text = textForFinding(finding);
    if (finding.severity === "critical") return "high";
    if (finding.severity === "high" && /(injection|secret|auth|token|command|sql|path traversal|rce)/.test(text)) {
        return "high";
    }
    if (finding.severity === "high" || finding.severity === "medium") return "medium";
    if (finding.severity === "low") return "low";
    return "unknown";
}

function stableCanaryHash(owner: string, repo: string): number {
    const input = `${owner}/${repo}`.toLowerCase();
    const digest = createHash("sha256").update(input).digest("hex");
    const bucket = Number.parseInt(digest.slice(0, 8), 16);
    return bucket % 100;
}

function isCanaryEnabled(owner: string, repo: string): boolean {
    if (SECURITY_CANARY_PERCENT >= 100) return true;
    return stableCanaryHash(owner, repo) < SECURITY_CANARY_PERCENT;
}

function scoreFromConfidence(finding: SecurityFinding): number {
    if (typeof finding.confidenceScore === "number") return finding.confidenceScore;
    if (finding.confidence === "high") return 0.9;
    if (finding.confidence === "medium") return 0.72;
    if (finding.confidence === "low") return 0.45;
    return 0.7;
}

function applySignal(
    signals: SecurityVerificationSignal[],
    score: number,
    signal: SecurityVerificationSignal,
): number {
    const weight = signal.weight ?? 0;
    signals.push(signal);
    return clampScore(score + (signal.passed ? weight : -weight));
}

type SupabaseOperation = "select" | "update" | "delete";

interface SupabasePolicyEvidence {
    isAuthzContext: boolean;
    policyFiles: VerificationRepositoryFile[];
    tableNames: string[];
    requiredOperations: SupabaseOperation[];
    hasPolicyFiles: boolean;
    hasRls: boolean;
    hasAuthUidConstraint: boolean;
    hasRpcOrTriggerGuard: boolean;
    operationCoverage: Record<SupabaseOperation, boolean>;
}

interface VerificationContext {
    repositoryFiles: VerificationRepositoryFile[];
    enableAiAdjudication: boolean;
    adjudicateFinding: (input: SecurityAdjudicationInput) => Promise<SecurityAdjudicationResult>;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSupabasePolicyPath(path: string): boolean {
    const normalized = path.replace(/\\/g, "/").toLowerCase();
    return (
        normalized.startsWith("supabase/migrations/") ||
        normalized.startsWith("supabase/sql/") ||
        normalized.startsWith("supabase/policies/") ||
        normalized.startsWith("supabase/schema/")
    ) && /\.sql$/i.test(normalized);
}

function findingLikelyAuthzContext(finding: SecurityFinding): boolean {
    const text = textForFinding(finding);
    return /(auth|authoriz|permission|ownership|access control|row[-\s]?level|rls|supabase|forbidden|tenant|project deletion)/i.test(
        text
    );
}

function extractLikelyTableNames(finding: SecurityFinding): string[] {
    const text = [
        finding.title,
        finding.description,
        finding.recommendation,
        finding.snippet ?? "",
    ].join("\n");
    const tables = new Set<string>();
    const patterns = [
        /\.from\(\s*['"`]([a-z0-9_]+)['"`]\s*\)/gi,
        /\b(?:from|into|update|table)\s+['"`]?([a-z0-9_]+)['"`]?/gi,
    ];
    for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
            const candidate = (match[1] ?? "").toLowerCase();
            if (!candidate) continue;
            if (["public", "where", "set", "values", "select", "delete", "update", "insert"].includes(candidate)) {
                continue;
            }
            tables.add(candidate);
            if (tables.size >= 4) break;
        }
        if (tables.size >= 4) break;
    }
    return Array.from(tables);
}

function inferRequiredOperations(finding: SecurityFinding): SupabaseOperation[] {
    const text = textForFinding(finding);
    const operations = new Set<SupabaseOperation>();
    if (/(delete|deletion|remove|destroy)/i.test(text)) operations.add("delete");
    if (/(update|modify|write|upvote|increment|decrement|manipulat)/i.test(text)) operations.add("update");
    if (/(select|fetch|read|list|query|view)/i.test(text)) operations.add("select");
    return Array.from(operations);
}

function detectOperationCoverage(
    content: string,
    operation: SupabaseOperation,
    tableNames: string[]
): boolean {
    if (tableNames.length === 0) {
        return new RegExp(`create\\s+policy[\\s\\S]{0,180}?for\\s+${operation}`, "i").test(content);
    }
    return tableNames.some((table) => {
        const escaped = escapeRegExp(table);
        const tablePattern = `(?:"${escaped}"|${escaped})`;
        return new RegExp(
            `create\\s+policy[\\s\\S]{0,260}?on\\s+(?:public\\.)?${tablePattern}[\\s\\S]{0,260}?for\\s+${operation}`,
            "i"
        ).test(content);
    });
}

function detectRls(content: string, tableNames: string[]): boolean {
    if (tableNames.length === 0) {
        return /enable\s+row\s+level\s+security/i.test(content);
    }
    return tableNames.some((table) => {
        const escaped = escapeRegExp(table);
        const tablePattern = `(?:"${escaped}"|${escaped})`;
        return (
            new RegExp(
                `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${tablePattern}\\s+enable\\s+row\\s+level\\s+security`,
                "i"
            ).test(content) ||
            new RegExp(
                `enable\\s+row\\s+level\\s+security\\s+on\\s+(?:table\\s+)?(?:public\\.)?${tablePattern}`,
                "i"
            ).test(content)
        );
    });
}

function collectSupabasePolicyEvidence(
    finding: SecurityFinding,
    repositoryFiles: VerificationRepositoryFile[]
): SupabasePolicyEvidence {
    const isAuthzContext = findingLikelyAuthzContext(finding);
    const policyFiles = repositoryFiles.filter((file) => isSupabasePolicyPath(file.path));
    const tableNames = extractLikelyTableNames(finding);
    const requiredOperations = inferRequiredOperations(finding);
    const combinedPolicy = policyFiles.map((file) => file.content).join("\n\n");

    const operationCoverage: Record<SupabaseOperation, boolean> = {
        select: detectOperationCoverage(combinedPolicy, "select", tableNames),
        update: detectOperationCoverage(combinedPolicy, "update", tableNames),
        delete: detectOperationCoverage(combinedPolicy, "delete", tableNames),
    };

    return {
        isAuthzContext,
        policyFiles,
        tableNames,
        requiredOperations,
        hasPolicyFiles: policyFiles.length > 0,
        hasRls: detectRls(combinedPolicy, tableNames),
        hasAuthUidConstraint: /auth\.uid\(\)/i.test(combinedPolicy),
        hasRpcOrTriggerGuard: /(create\s+(or\s+replace\s+)?function|create\s+trigger|returns\s+trigger|security\s+definer)/i.test(
            combinedPolicy
        ),
        operationCoverage,
    };
}

function hasStrongPolicyEvidence(evidence: SupabasePolicyEvidence): boolean {
    if (!evidence.hasPolicyFiles) return false;
    if (!evidence.hasRls && !evidence.hasAuthUidConstraint) return false;
    if (evidence.requiredOperations.length === 0) {
        return evidence.hasRls || evidence.hasAuthUidConstraint;
    }
    return evidence.requiredOperations.every((operation) => evidence.operationCoverage[operation]);
}

function buildPolicyEvidenceSummary(evidence: SupabasePolicyEvidence): string {
    const files = evidence.policyFiles.slice(0, 8).map((file) => file.path).join(", ");
    const requiredOps = evidence.requiredOperations.length > 0 ? evidence.requiredOperations.join(", ") : "none";
    return [
        `Authz-context: ${evidence.isAuthzContext ? "yes" : "no"}.`,
        `Policy files: ${evidence.policyFiles.length} (${files || "none"}).`,
        `Tables: ${evidence.tableNames.join(", ") || "unknown"}.`,
        `Required ops: ${requiredOps}.`,
        `RLS enabled: ${evidence.hasRls ? "yes" : "no"}.`,
        `auth.uid() ownership constraint: ${evidence.hasAuthUidConstraint ? "yes" : "no"}.`,
        `Operation coverage: select=${evidence.operationCoverage.select}, update=${evidence.operationCoverage.update}, delete=${evidence.operationCoverage.delete}.`,
        `RPC/trigger guard hints: ${evidence.hasRpcOrTriggerGuard ? "yes" : "no"}.`,
    ].join(" ");
}

async function verifyDependencyFinding(finding: SecurityFinding): Promise<{
    score: number;
    signals: SecurityVerificationSignal[];
    status: SecurityVerificationStatus;
    rationale: string;
    exploitabilityTag: SecurityFinding["exploitabilityTag"];
}> {
    let score = scoreFromConfidence(finding);
    const signals: SecurityVerificationSignal[] = [];

    score = applySignal(signals, score, {
        name: "has_dependency_cve_signal",
        passed: /CVE-\d{4}-\d+/i.test(finding.recommendation) || /CVE-\d{4}-\d+/i.test(finding.description),
        detail: "Dependency finding includes explicit CVE or advisory marker.",
        weight: 0.12,
    });

    const advisory = await resolveDependencyAdvisory(finding);
    score = applySignal(signals, score, {
        name: "live_advisory_resolution",
        passed: advisory.source === "live-osv" ? advisory.hasLiveMatch : true,
        detail: advisory.detail,
        weight: advisory.source === "live-osv" ? 0.15 : 0.06,
    });

    const status =
        score >= SECURITY_VERIFICATION_THRESHOLDS.autoVerified
            ? "AUTO_VERIFIED_TRUE"
            : score <= SECURITY_VERIFICATION_THRESHOLDS.autoRejected
                ? "AUTO_REJECTED_FALSE"
                : "INCONCLUSIVE_HIDDEN";

    return {
        score,
        signals,
        status,
        rationale: `Dependency verification used ${advisory.source} advisory resolution and exploitability tagging.`,
        exploitabilityTag: advisory.exploitabilityTag,
    };
}

function verifyCodeLikeFinding(finding: SecurityFinding): {
    score: number;
    signals: SecurityVerificationSignal[];
    status: SecurityVerificationStatus;
    rationale: string;
    exploitabilityTag: SecurityFinding["exploitabilityTag"];
} {
    let score = scoreFromConfidence(finding);
    const signals: SecurityVerificationSignal[] = [];
    const text = textForFinding(finding);
    const isInjectionFamily = /(injection|sql|xss|path traversal|command)/i.test(text);
    const hasSink = hasEvidenceType(finding, "sink") || /(query\(|exec\(|innerhtml|dangerouslysetinnerhtml|readfile)/i.test(text);
    const hasSource = hasEvidenceType(finding, "source") || hasInputSourceHint(finding);
    const noSanitizer = !hasSanitizerHint(finding);

    score = applySignal(signals, score, {
        name: "has_sink_signal",
        passed: hasSink,
        detail: "Potential exploit sink signal detected.",
        weight: 0.13,
    });

    score = applySignal(signals, score, {
        name: "has_source_signal",
        passed: hasSource,
        detail: "User-input or taint source signal detected.",
        weight: 0.1,
    });

    score = applySignal(signals, score, {
        name: "no_sanitizer_signal",
        passed: noSanitizer,
        detail: "No sanitization signal was detected in the local context.",
        weight: 0.12,
    });

    score = applySignal(signals, score, {
        name: "has_cwe_mapping",
        passed: Boolean(finding.cwe),
        detail: "Finding includes CWE mapping for classifier consistency.",
        weight: 0.05,
    });

    const mandatoryFlowSatisfied = !isInjectionFamily || (hasSink && hasSource && noSanitizer);

    const status =
        mandatoryFlowSatisfied && score >= SECURITY_VERIFICATION_THRESHOLDS.autoVerified
            ? "AUTO_VERIFIED_TRUE"
            : score <= SECURITY_VERIFICATION_THRESHOLDS.autoRejected || !mandatoryFlowSatisfied
                ? "AUTO_REJECTED_FALSE"
                : "INCONCLUSIVE_HIDDEN";

    return {
        score,
        signals,
        status,
        rationale: isInjectionFamily
            ? "Injection-family verification requires source-to-sink continuity and absence of sanitization signals."
            : "Code finding verification is confidence + evidence weighted.",
        exploitabilityTag: inferExploitabilityTag(finding),
    };
}

function verifySecretOrConfigFinding(finding: SecurityFinding): {
    score: number;
    signals: SecurityVerificationSignal[];
    status: SecurityVerificationStatus;
    rationale: string;
    exploitabilityTag: SecurityFinding["exploitabilityTag"];
} {
    let score = scoreFromConfidence(finding);
    const signals: SecurityVerificationSignal[] = [];
    const text = textForFinding(finding);
    const appearsPlaceholder = /(placeholder|dummy|example|changeme|test key|fake|fixture)/i.test(text);
    const looksProdPath = !/(test|fixture|spec|mock|sample)/i.test(finding.file.toLowerCase());

    score = applySignal(signals, score, {
        name: "non_placeholder_value",
        passed: !appearsPlaceholder,
        detail: "Secret/config value does not look like a placeholder token.",
        weight: 0.15,
    });

    score = applySignal(signals, score, {
        name: "production_context_path",
        passed: looksProdPath,
        detail: "File path context appears to be production-facing rather than tests/fixtures.",
        weight: 0.1,
    });

    score = applySignal(signals, score, {
        name: "high_confidence_detector",
        passed: finding.confidence === "high" || (finding.confidenceScore ?? 0) >= 0.85,
        detail: "Detector confidence signal from scanner metadata.",
        weight: 0.1,
    });

    const status =
        score >= SECURITY_VERIFICATION_THRESHOLDS.autoVerified
            ? "AUTO_VERIFIED_TRUE"
            : score <= SECURITY_VERIFICATION_THRESHOLDS.autoRejected
                ? "AUTO_REJECTED_FALSE"
                : "INCONCLUSIVE_HIDDEN";

    return {
        score,
        signals,
        status,
        rationale: "Secret/config verification combines placeholder detection, context checks, and detector confidence.",
        exploitabilityTag: inferExploitabilityTag(finding),
    };
}

function applySupabasePolicySignals(
    finding: SecurityFinding,
    signals: SecurityVerificationSignal[],
    score: number,
    repositoryFiles: VerificationRepositoryFile[]
): {
    score: number;
    evidence: SupabasePolicyEvidence;
    summary: string;
} {
    const evidence = collectSupabasePolicyEvidence(finding, repositoryFiles);
    const summary = buildPolicyEvidenceSummary(evidence);
    if (!evidence.isAuthzContext) {
        return { score, evidence, summary };
    }

    let nextScore = score;
    nextScore = applySignal(signals, nextScore, {
        name: "supabase_policy_files_present",
        passed: evidence.hasPolicyFiles,
        detail: evidence.hasPolicyFiles
            ? `Supabase policy SQL files were found (${evidence.policyFiles.length}).`
            : "No Supabase policy SQL files were found in configured folders.",
        weight: 0.08,
    });

    nextScore = applySignal(signals, nextScore, {
        name: "supabase_rls_enabled",
        passed: evidence.hasRls,
        detail: evidence.hasRls
            ? "Detected row-level security enablement in Supabase SQL artifacts."
            : "Could not confirm row-level security enablement for this finding context.",
        weight: 0.1,
    });

    nextScore = applySignal(signals, nextScore, {
        name: "supabase_auth_uid_constraint",
        passed: evidence.hasAuthUidConstraint,
        detail: evidence.hasAuthUidConstraint
            ? "Detected auth.uid() ownership constraints in policy SQL."
            : "No auth.uid() ownership constraints detected in policy SQL context.",
        weight: 0.1,
    });

    for (const operation of evidence.requiredOperations) {
        nextScore = applySignal(signals, nextScore, {
            name: `supabase_policy_for_${operation}`,
            passed: evidence.operationCoverage[operation],
            detail: evidence.operationCoverage[operation]
                ? `Detected ${operation.toUpperCase()} policy coverage in Supabase SQL.`
                : `Missing ${operation.toUpperCase()} policy coverage for this finding context.`,
            weight: 0.08,
        });
    }

    if (/(upvote|vote|count|increment|decrement|aggregate)/i.test(textForFinding(finding))) {
        nextScore = applySignal(signals, nextScore, {
            name: "supabase_rpc_or_trigger_guard",
            passed: evidence.hasRpcOrTriggerGuard,
            detail: evidence.hasRpcOrTriggerGuard
                ? "Detected RPC/trigger guard hints for aggregate mutation workflows."
                : "No RPC/trigger guard hints found for aggregate mutation workflows.",
            weight: 0.06,
        });
    }

    nextScore = applySignal(signals, nextScore, {
        name: "supabase_missing_policy_evidence",
        passed: hasStrongPolicyEvidence(evidence),
        detail: hasStrongPolicyEvidence(evidence)
            ? "Policy evidence is sufficient for conservative authorization analysis."
            : "Policy evidence is incomplete for high-confidence authorization adjudication.",
        weight: 0.12,
    });

    return {
        score: nextScore,
        evidence,
        summary,
    };
}

async function applyAdjudicatorSignals(params: {
    finding: SecurityFinding;
    score: number;
    signals: SecurityVerificationSignal[];
    currentStatus: SecurityVerificationStatus;
    currentRationale: string;
    policyEvidence: SupabasePolicyEvidence;
    policySummary: string;
    context: VerificationContext;
}): Promise<{
    score: number;
    status: SecurityVerificationStatus;
    rationale: string;
}> {
    const adjudication = await params.context.adjudicateFinding({
        finding: params.finding,
        policyEvidenceAvailable: params.policyEvidence.hasPolicyFiles,
        policyEvidenceSummary: params.policySummary,
        policyFiles: params.policyEvidence.policyFiles.map((file) => file.path),
    });

    const verdictConfidence = Math.round(adjudication.confidence * 100);
    const verdictSignalName = `llm_adjudicator_${adjudication.verdict}`;

    const scoreAfterVerdict = applySignal(params.signals, params.score, {
        name: verdictSignalName,
        passed: adjudication.verdict === "true_positive",
        detail: `${adjudication.verdict} (${verdictConfidence}% confidence): ${adjudication.justification}`,
        weight: 0.09,
    });

    if (adjudication.evidenceUsed.length > 0) {
        params.signals.push({
            name: "llm_adjudicator_evidence_used",
            passed: true,
            detail: adjudication.evidenceUsed.join(" | "),
            weight: 0,
        });
    }

    if (adjudication.verdict === "needs_more_evidence") {
        return {
            score: scoreAfterVerdict,
            status: "INCONCLUSIVE_HIDDEN",
            rationale: `${params.currentRationale} Adjudicator verdict: needs_more_evidence (${verdictConfidence}%).`,
        };
    }

    if (
        adjudication.verdict === "false_positive" &&
        adjudication.confidence >= 0.85 &&
        hasStrongPolicyEvidence(params.policyEvidence)
    ) {
        params.signals.push({
            name: "conservative_false_positive_gate",
            passed: true,
            detail: "False-positive adjudication met confidence and policy-evidence requirements for auto rejection.",
            weight: 0,
        });
        return {
            score: scoreAfterVerdict,
            status: "AUTO_REJECTED_FALSE",
            rationale: `${params.currentRationale} Adjudicator conservatively rejected this finding as false positive (${verdictConfidence}%).`,
        };
    }

    if (adjudication.verdict === "false_positive") {
        params.signals.push({
            name: "conservative_false_positive_gate",
            passed: false,
            detail: "False-positive adjudication did not meet confidence/policy-evidence threshold; preserving deterministic status.",
            weight: 0,
        });
    }

    return {
        score: scoreAfterVerdict,
        status: params.currentStatus,
        rationale: `${params.currentRationale} Adjudicator verdict: ${adjudication.verdict} (${verdictConfidence}%).`,
    };
}

async function verifySingleFinding(
    finding: SecurityFinding,
    context: VerificationContext
): Promise<{
    score: number;
    signals: SecurityVerificationSignal[];
    status: SecurityVerificationStatus;
    rationale: string;
    exploitabilityTag: SecurityFinding["exploitabilityTag"];
}> {
    let baseResult:
        | Awaited<ReturnType<typeof verifyDependencyFinding>>
        | ReturnType<typeof verifyCodeLikeFinding>
        | ReturnType<typeof verifySecretOrConfigFinding>;

    if (finding.type === "dependency") {
        baseResult = await verifyDependencyFinding(finding);
    } else if (finding.type === "secret" || finding.type === "configuration") {
        baseResult = verifySecretOrConfigFinding(finding);
    } else {
        baseResult = verifyCodeLikeFinding(finding);
    }

    let score = baseResult.score;
    const signals: SecurityVerificationSignal[] = [...baseResult.signals];
    let status = baseResult.status;
    let rationale = baseResult.rationale;

    const policy = applySupabasePolicySignals(
        finding,
        signals,
        score,
        context.repositoryFiles
    );
    score = policy.score;
    if (policy.evidence.isAuthzContext) {
        rationale = `${rationale} ${policy.summary}`;
    }

    if (context.enableAiAdjudication) {
        const adjudicated = await applyAdjudicatorSignals({
            finding,
            score,
            signals,
            currentStatus: status,
            currentRationale: rationale,
            policyEvidence: policy.evidence,
            policySummary: policy.summary,
            context,
        });
        score = adjudicated.score;
        status = adjudicated.status;
        rationale = adjudicated.rationale;
    }

    return {
        score,
        signals,
        status,
        rationale,
        exploitabilityTag: baseResult.exploitabilityTag,
    };
}

function toLifecycleStatus(status: SecurityVerificationStatus): SecurityVerificationStatus {
    if (status === "AUTO_VERIFIED_TRUE") return "OPEN";
    return status;
}

function annotateFinding(
    finding: SecurityFinding,
    result: {
        score: number;
        signals: SecurityVerificationSignal[];
        status: SecurityVerificationStatus;
        rationale: string;
        exploitabilityTag: SecurityFinding["exploitabilityTag"];
    },
    gateDecision: "include" | "exclude",
): SecurityFinding {
    return {
        ...finding,
        verificationStatus: result.status,
        verificationSignals: result.signals,
        verificationScore: result.score,
        verificationRationale: result.rationale,
        gateDecision,
        exploitabilityTag: result.exploitabilityTag,
    };
}

async function trackVerificationStats(stats: VerifierStats): Promise<void> {
    try {
        const pipeline = kv.pipeline();
        pipeline.incr("stats:security_verification:detected");
        pipeline.incrby("stats:security_verification:detected_total", stats.detected);
        pipeline.incrby("stats:security_verification:verified_true_total", stats.verifiedTrue);
        pipeline.incrby("stats:security_verification:rejected_false_total", stats.rejectedFalse);
        pipeline.incrby("stats:security_verification:inconclusive_hidden_total", stats.inconclusiveHidden);
        await pipeline.exec();
    } catch {
        // Telemetry must never interrupt scan flow.
    }
}

export async function verifyDetectedFindings(params: VerifyDetectedFindingsParams): Promise<VerifyDetectedFindingsResult> {
    const canaryApplied = isCanaryEnabled(params.owner, params.repo);
    const verificationGateEnabled = SECURITY_VERIFICATION_FLAGS.verificationGate && canaryApplied;
    const verifiedOnlyReportsEnabled = SECURITY_VERIFICATION_FLAGS.verifiedOnlyReports && canaryApplied;
    const context: VerificationContext = {
        repositoryFiles: params.repositoryFiles ?? [],
        enableAiAdjudication: params.enableAiAdjudication === true,
        adjudicateFinding: params.adjudicateFinding ?? adjudicateSecurityFindingWithGemini,
    };

    if (!verificationGateEnabled) {
        const bypassed = params.findings.map((finding, index) => {
            const annotated = annotateFinding(
                finding,
                {
                    score: clampScore(Math.max(SECURITY_VERIFICATION_THRESHOLDS.autoVerified, scoreFromConfidence(finding))),
                    signals: [{
                        name: "verification_gate_bypassed",
                        passed: true,
                        detail: "Verification gate disabled by feature flag/canary; allowing finding.",
                        weight: 0,
                    }],
                    status: "AUTO_VERIFIED_TRUE",
                    rationale: "Verification gate bypassed; compatibility mode enabled.",
                    exploitabilityTag: inferExploitabilityTag(finding),
                },
                "include",
            );
            return {
                findingIndex: index,
                findingFingerprint: buildFindingFingerprint(annotated),
                verificationStatus: "AUTO_VERIFIED_TRUE" as const,
                lifecycleStatus: "OPEN" as const,
                gateDecision: "include" as const,
                verificationScore: annotated.verificationScore ?? 1,
                verificationSignals: annotated.verificationSignals ?? [],
                verificationRationale: annotated.verificationRationale ?? "",
                exploitabilityTag: annotated.exploitabilityTag ?? "unknown",
                finding: annotated,
            };
        });

        const stats: VerifierStats = {
            detected: params.findings.length,
            verifiedTrue: params.findings.length,
            rejectedFalse: 0,
            inconclusiveHidden: 0,
            canaryApplied,
            verificationGateEnabled,
            verifiedOnlyReportsEnabled,
        };

        await trackVerificationStats(stats);

        return {
            verifiedFindings: bypassed.map((record) => record.finding),
            hiddenFindings: [],
            rejectedFindings: [],
            records: bypassed,
            stats,
        };
    }

    const records: FindingVerificationRecord[] = [];
    const verifiedFindings: SecurityFinding[] = [];
    const hiddenFindings: SecurityFinding[] = [];
    const rejectedFindings: SecurityFinding[] = [];

    for (let index = 0; index < params.findings.length; index += 1) {
        const finding = params.findings[index];
        const result = await verifySingleFinding(finding, context);
        const gateDecision = result.status === "AUTO_VERIFIED_TRUE" ? "include" : "exclude";
        const annotated = annotateFinding(finding, result, gateDecision);
        const fingerprint = buildFindingFingerprint(annotated);

        if (gateDecision === "include" || !verifiedOnlyReportsEnabled) {
            verifiedFindings.push(annotated);
        } else if (result.status === "AUTO_REJECTED_FALSE") {
            rejectedFindings.push(annotated);
        } else {
            hiddenFindings.push(annotated);
        }

        records.push({
            findingIndex: index,
            findingFingerprint: fingerprint,
            verificationStatus: result.status,
            lifecycleStatus: toLifecycleStatus(result.status),
            gateDecision,
            verificationScore: result.score,
            verificationSignals: result.signals,
            verificationRationale: result.rationale,
            exploitabilityTag: result.exploitabilityTag,
            finding: annotated,
        });
    }

    const stats: VerifierStats = {
        detected: params.findings.length,
        verifiedTrue: records.filter((record) => record.verificationStatus === "AUTO_VERIFIED_TRUE").length,
        rejectedFalse: records.filter((record) => record.verificationStatus === "AUTO_REJECTED_FALSE").length,
        inconclusiveHidden: records.filter((record) => record.verificationStatus === "INCONCLUSIVE_HIDDEN").length,
        canaryApplied,
        verificationGateEnabled,
        verifiedOnlyReportsEnabled,
    };

    await trackVerificationStats(stats);

    return {
        verifiedFindings,
        hiddenFindings,
        rejectedFindings,
        records,
        stats,
    };
}
