import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SecurityFinding } from "@/lib/security-scanner";

const { generateContentMock, getGenerativeModelMock, getGenAIMock } = vi.hoisted(() => ({
    generateContentMock: vi.fn(),
    getGenerativeModelMock: vi.fn(),
    getGenAIMock: vi.fn(),
}));

vi.mock("@/lib/ai-client", () => ({
    getGenAI: getGenAIMock,
    DEFAULT_MODEL: "gemini-3-flash-preview",
}));

import { adjudicateSecurityFindingWithGemini } from "@/lib/gemini-security";

const finding: SecurityFinding = {
    type: "code",
    severity: "high",
    title: "Authentication/Authorization Issue",
    description: "Deletion flow may not enforce ownership.",
    file: "src/components/LeftSidebar.tsx",
    line: 40,
    recommendation: "Verify ownership via policy.",
    confidence: "high",
    confidenceScore: 0.88,
};

describe("adjudicateSecurityFindingWithGemini", () => {
    beforeEach(() => {
        generateContentMock.mockReset();
        getGenerativeModelMock.mockReset();
        getGenAIMock.mockReset();

        getGenerativeModelMock.mockReturnValue({
            generateContent: generateContentMock,
        });
        getGenAIMock.mockReturnValue({
            getGenerativeModel: getGenerativeModelMock,
        });
    });

    it("returns needs_more_evidence when model output is invalid JSON", async () => {
        generateContentMock.mockResolvedValue({
            response: {
                text: () => "not-json-response",
            },
        });

        const result = await adjudicateSecurityFindingWithGemini({
            finding,
            policyEvidenceAvailable: false,
            policyEvidenceSummary: "No policy files found.",
            policyFiles: [],
        });

        expect(result.verdict).toBe("needs_more_evidence");
        expect(result.justification.toLowerCase()).toContain("invalid json");
    });

    it("returns needs_more_evidence when model invocation fails", async () => {
        generateContentMock.mockRejectedValue(new Error("upstream failure"));

        const result = await adjudicateSecurityFindingWithGemini({
            finding,
            policyEvidenceAvailable: false,
            policyEvidenceSummary: "No policy files found.",
            policyFiles: [],
        });

        expect(result.verdict).toBe("needs_more_evidence");
        expect(result.justification.toLowerCase()).toContain("failed");
    });

    it("parses strict JSON adjudication output", async () => {
        generateContentMock.mockResolvedValue({
            response: {
                text: () =>
                    JSON.stringify({
                        verdict: "false_positive",
                        confidence: 0.92,
                        justification: "RLS policy blocks unauthorized delete.",
                        evidence_used: ["auth.uid() in delete policy"],
                    }),
            },
        });

        const result = await adjudicateSecurityFindingWithGemini({
            finding,
            policyEvidenceAvailable: true,
            policyEvidenceSummary: "RLS and delete policy found.",
            policyFiles: ["supabase/policies/projects.sql"],
        });

        expect(result.verdict).toBe("false_positive");
        expect(result.confidence).toBe(0.92);
        expect(result.evidenceUsed).toContain("auth.uid() in delete policy");
    });
});
