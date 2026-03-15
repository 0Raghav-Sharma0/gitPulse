import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    getSessionUserIdMock,
    getScanResultWithStatusMock,
    canAccessPrivateReportMock,
    createFalsePositiveSubmissionMock,
    trackReportConversionEventMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    getSessionUserIdMock: vi.fn(),
    getScanResultWithStatusMock: vi.fn(),
    canAccessPrivateReportMock: vi.fn(),
    createFalsePositiveSubmissionMock: vi.fn(),
    trackReportConversionEventMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/lib/session-guard", () => ({
    getSessionUserId: getSessionUserIdMock,
}));

vi.mock("@/lib/services/scan-storage", () => ({
    getScanResultWithStatus: getScanResultWithStatusMock,
    saveScanResult: vi.fn(),
    getLatestScanId: vi.fn(),
}));

vi.mock("@/lib/services/report-access", () => ({
    canAccessPrivateReport: canAccessPrivateReportMock,
}));

vi.mock("@/lib/services/report-false-positives", () => ({
    createFalsePositiveSubmission: createFalsePositiveSubmissionMock,
    updateFalsePositiveStatus: vi.fn(),
}));

vi.mock("@/lib/analytics", async () => {
    const actual = await vi.importActual<typeof import("@/lib/analytics")>("@/lib/analytics");
    return {
        ...actual,
        trackReportConversionEvent: trackReportConversionEventMock,
    };
});

import { submitReportFalsePositive } from "@/app/actions";

describe("submitReportFalsePositive", () => {
    beforeEach(() => {
        authMock.mockReset();
        getSessionUserIdMock.mockReset();
        getScanResultWithStatusMock.mockReset();
        canAccessPrivateReportMock.mockReset();
        createFalsePositiveSubmissionMock.mockReset();
        trackReportConversionEventMock.mockReset();

        authMock.mockResolvedValue({ user: { id: "user_1" } });
        getSessionUserIdMock.mockReturnValue("user_1");
        canAccessPrivateReportMock.mockReturnValue(true);
        getScanResultWithStatusMock.mockResolvedValue({
            status: "ok",
            scan: {
                id: "scan_1",
                owner: "acme",
                repo: "widget",
                timestamp: Date.now(),
                expiresAt: Date.now() + 60_000,
                depth: "deep",
                summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0, info: 0 },
                findings: [{
                    type: "code",
                    severity: "high",
                    title: "Potential SQL Injection",
                    description: "User input reaches query sink.",
                    file: "src/api.ts",
                    line: 42,
                    recommendation: "Use parameterized queries.",
                    confidence: "high",
                }],
            },
        });
    });

    it("writes a submission for private report access and tracks analytics", async () => {
        await submitReportFalsePositive({
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            isSharedView: false,
            reason: "FALSE_DATAFLOW",
            details: "The query builder parameterizes this path before execution.",
        });

        expect(createFalsePositiveSubmissionMock).toHaveBeenCalledWith(expect.objectContaining({
            scanId: "scan_1",
            submittedByUserId: "user_1",
            isSharedView: false,
            reason: "FALSE_DATAFLOW",
            details: "The query builder parameterizes this path before execution.",
        }));
        expect(trackReportConversionEventMock).toHaveBeenCalledWith("report_false_positive_flagged", "scan_1", {
            actorUsername: null,
        });
    });

    it("allows anonymous shared-view submissions", async () => {
        authMock.mockResolvedValue(null);
        getSessionUserIdMock.mockReturnValue(undefined);

        await submitReportFalsePositive({
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            isSharedView: true,
            reason: "OTHER",
            details: "Shared reviewer notes",
        });

        expect(createFalsePositiveSubmissionMock).toHaveBeenCalledWith(expect.objectContaining({
            submittedByUserId: null,
            isSharedView: true,
        }));
    });

    it("rejects empty details", async () => {
        await expect(submitReportFalsePositive({
            scanId: "scan_1",
            findingIndex: 0,
            findingFingerprint: "code|src/api.ts|potential sql injection||user input reaches query sink.",
            isSharedView: false,
            reason: "NOT_A_VULNERABILITY",
            details: "   ",
        })).rejects.toThrow("Please include details for the false positive report");

        expect(createFalsePositiveSubmissionMock).not.toHaveBeenCalled();
    });
});
