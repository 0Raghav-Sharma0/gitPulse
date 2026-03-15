import { describe, expect, it, vi } from "vitest";

import type { SecurityFinding } from "@/lib/security-scanner";
import { verifyDetectedFindings } from "@/lib/services/security-verification";

function makeCodeFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
    return {
        type: "code",
        severity: "high",
        title: "SQL injection via tainted query construction",
        description: "Tainted input reaches query sink.",
        file: "src/api/user.ts",
        line: 42,
        recommendation: "Use parameterized queries.",
        cwe: "CWE-89",
        confidence: "high",
        confidenceScore: 0.9,
        evidence: [
            { type: "source", message: "req.query.id controls variable", line: 40 },
            { type: "sink", message: "db.query receives dynamic template", line: 42 },
        ],
        ...overrides,
    };
}

function makeAuthzFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
    return {
        type: "code",
        severity: "high",
        title: "Authentication/Authorization Issue",
        description: "Project deletion may not verify ownership before delete.",
        file: "src/components/LeftSidebar.tsx",
        line: 40,
        recommendation: "Ensure ownership checks and RLS policy coverage.",
        cwe: "CWE-285",
        confidence: "high",
        confidenceScore: 0.9,
        snippet: "supabase.from('projects').delete().eq('id', id)",
        evidence: [{ type: "context", message: "Delete path touches projects table" }],
        ...overrides,
    };
}

describe("security verification gate", () => {
    it("verifies strong source-to-sink findings as true positives", async () => {
        const finding = makeCodeFinding({
            recommendation: "Use query placeholders and strict validation.",
        });
        const result = await verifyDetectedFindings({
            scanId: "scan_1",
            owner: "acme",
            repo: "widget",
            findings: [finding],
        });

        expect(result.verifiedFindings).toHaveLength(1);
        expect(result.hiddenFindings).toHaveLength(0);
        expect(result.rejectedFindings).toHaveLength(0);
        expect(result.records[0]?.verificationStatus).toBe("AUTO_VERIFIED_TRUE");
        expect(result.records[0]?.gateDecision).toBe("include");
    });

    it("rejects injection findings when sanitizer signal is present", async () => {
        const finding = makeCodeFinding({
            snippet: "const id = sanitize(req.query.id); db.query(`SELECT ... ${id}`)",
            evidence: [
                { type: "source", message: "req.query.id controls variable", line: 40 },
                { type: "sink", message: "db.query receives dynamic template", line: 42 },
                { type: "sanitizer", message: "sanitize() applied", line: 41 },
            ],
        });

        const result = await verifyDetectedFindings({
            scanId: "scan_2",
            owner: "acme",
            repo: "widget",
            findings: [finding],
        });

        expect(result.verifiedFindings).toHaveLength(0);
        expect(result.rejectedFindings).toHaveLength(1);
        expect(result.records[0]?.verificationStatus).toBe("AUTO_REJECTED_FALSE");
        expect(result.records[0]?.gateDecision).toBe("exclude");
    });

    it("hides inconclusive findings from report output", async () => {
        const weak = makeCodeFinding({
            type: "configuration",
            severity: "medium",
            title: "Insecure HTTP Endpoint in Config",
            description: "A service URL uses HTTP instead of HTTPS.",
            file: "config/service.env",
            recommendation: "Use HTTPS service URLs in production.",
            confidence: "low",
            confidenceScore: 0.5,
            evidence: [{ type: "context", message: "detector matched API_URL=http://..." }],
        });

        const result = await verifyDetectedFindings({
            scanId: "scan_3",
            owner: "acme",
            repo: "widget",
            findings: [weak],
        });

        expect(result.verifiedFindings).toHaveLength(0);
        expect(result.hiddenFindings).toHaveLength(1);
        expect(result.records[0]?.verificationStatus).toBe("INCONCLUSIVE_HIDDEN");
    });

    it("adds supabase policy evidence signals for authz findings", async () => {
        const finding = makeAuthzFinding();
        const repositoryFiles = [
            {
                path: "supabase/migrations/20260310_policies.sql",
                content: `
                    alter table public.projects enable row level security;
                    create policy "projects_select_owner"
                        on public.projects
                        for select
                        using (auth.uid() = user_id);
                    create policy "projects_delete_owner"
                        on public.projects
                        for delete
                        using (auth.uid() = user_id);
                `,
            },
        ];

        const result = await verifyDetectedFindings({
            scanId: "scan_4",
            owner: "acme",
            repo: "widget",
            findings: [finding],
            repositoryFiles,
        });

        const signals = result.records[0]?.verificationSignals ?? [];
        expect(signals.some((signal) => signal.name === "supabase_policy_files_present" && signal.passed)).toBe(true);
        expect(signals.some((signal) => signal.name === "supabase_rls_enabled" && signal.passed)).toBe(true);
        expect(signals.some((signal) => signal.name === "supabase_auth_uid_constraint" && signal.passed)).toBe(true);
    });

    it("marks missing policy evidence when supabase authz finding lacks policy files", async () => {
        const finding = makeAuthzFinding();
        const result = await verifyDetectedFindings({
            scanId: "scan_5",
            owner: "acme",
            repo: "widget",
            findings: [finding],
            repositoryFiles: [],
        });

        const signals = result.records[0]?.verificationSignals ?? [];
        expect(signals.some((signal) => signal.name === "supabase_policy_files_present" && !signal.passed)).toBe(true);
        expect(signals.some((signal) => signal.name === "supabase_missing_policy_evidence" && !signal.passed)).toBe(true);
    });

    it("conservatively auto-rejects high-confidence false_positive adjudications with strong policy evidence", async () => {
        const finding = makeAuthzFinding();
        const adjudicator = vi.fn(async () => ({
            verdict: "false_positive" as const,
            confidence: 0.94,
            justification: "RLS and ownership constraints protect delete operations.",
            evidenceUsed: ["auth.uid() policy", "delete policy"],
            rawText: "{}",
        }));

        const result = await verifyDetectedFindings({
            scanId: "scan_6",
            owner: "acme",
            repo: "widget",
            findings: [finding],
            enableAiAdjudication: true,
            adjudicateFinding: adjudicator,
            repositoryFiles: [
                {
                    path: "supabase/policies/projects.sql",
                    content: `
                        alter table projects enable row level security;
                        create policy "projects_delete_owner"
                            on projects
                            for delete
                            using (auth.uid() = user_id);
                    `,
                },
            ],
        });

        expect(adjudicator).toHaveBeenCalledTimes(1);
        expect(result.verifiedFindings).toHaveLength(0);
        expect(result.rejectedFindings).toHaveLength(1);
        expect(result.records[0]?.verificationStatus).toBe("AUTO_REJECTED_FALSE");
    });

    it("maps adjudicator needs_more_evidence verdicts to inconclusive-hidden", async () => {
        const finding = makeCodeFinding();
        const adjudicator = vi.fn(async () => ({
            verdict: "needs_more_evidence" as const,
            confidence: 0.2,
            justification: "Insufficient source-to-sink context.",
            evidenceUsed: [],
            rawText: "{}",
        }));

        const result = await verifyDetectedFindings({
            scanId: "scan_7",
            owner: "acme",
            repo: "widget",
            findings: [finding],
            enableAiAdjudication: true,
            adjudicateFinding: adjudicator,
            repositoryFiles: [],
        });

        expect(result.verifiedFindings).toHaveLength(0);
        expect(result.hiddenFindings).toHaveLength(1);
        expect(result.records[0]?.verificationStatus).toBe("INCONCLUSIVE_HIDDEN");
    });

    it("does not call adjudicator when ai adjudication is disabled", async () => {
        const finding = makeCodeFinding();
        const adjudicator = vi.fn(async () => ({
            verdict: "true_positive" as const,
            confidence: 0.9,
            justification: "Strong source/sink continuity.",
            evidenceUsed: [],
            rawText: "{}",
        }));

        await verifyDetectedFindings({
            scanId: "scan_8",
            owner: "acme",
            repo: "widget",
            findings: [finding],
            enableAiAdjudication: false,
            adjudicateFinding: adjudicator,
        });

        expect(adjudicator).not.toHaveBeenCalled();
    });
});
