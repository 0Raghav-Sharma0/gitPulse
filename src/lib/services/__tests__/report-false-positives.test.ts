import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    createMock,
    findManyMock,
    groupByMock,
    updateMock,
} = vi.hoisted(() => ({
    createMock: vi.fn(),
    findManyMock: vi.fn(),
    groupByMock: vi.fn(),
    updateMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    prisma: {
        reportFalsePositive: {
            create: createMock,
            findMany: findManyMock,
            groupBy: groupByMock,
            update: updateMock,
        },
    },
}));

import {
    createFalsePositiveSubmission,
    getFalsePositiveReviewSummary,
    updateFalsePositiveStatus,
} from "@/lib/services/report-false-positives";

describe("report false positive services", () => {
    beforeEach(() => {
        createMock.mockReset();
        findManyMock.mockReset();
        groupByMock.mockReset();
        updateMock.mockReset();
    });

    it("creates a false positive submission with the expected snapshot payload", async () => {
        createMock.mockResolvedValue({ id: "fp_1" });

        await createFalsePositiveSubmission({
            scanId: "scan_1",
            owner: "acme",
            repo: "widget",
            findingFingerprint: "fp",
            findingIndex: 2,
            title: "Potential SQL Injection",
            severity: "high",
            type: "code",
            file: "src/api.ts",
            line: 42,
            confidence: "high",
            reason: "FALSE_DATAFLOW",
            details: "The sink is already sanitized before query execution.",
            isSharedView: true,
            submittedByUserId: null,
        });

        expect(createMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                scanId: "scan_1",
                owner: "acme",
                repo: "widget",
                findingFingerprint: "fp",
                findingIndex: 2,
                isSharedView: true,
            }),
        });
    });

    it("aggregates review summary counts and recent submissions", async () => {
        findManyMock.mockResolvedValue([
            {
                id: "fp_1",
                scanId: "scan_1",
                owner: "acme",
                repo: "widget",
                findingFingerprint: "fp",
                findingIndex: 0,
                title: "Potential SQL Injection",
                severity: "high",
                type: "code",
                file: "src/api.ts",
                line: 42,
                confidence: "high",
                reason: "NOT_A_VULNERABILITY",
                details: "This endpoint only returns static content.",
                isSharedView: true,
                status: "PENDING",
                submittedByUserId: null,
                submittedByUser: null,
                reviewedByUser: null,
                reviewedAt: null,
                createdAt: new Date("2026-03-09T10:00:00.000Z"),
                updatedAt: new Date("2026-03-09T10:00:00.000Z"),
            },
        ]);
        groupByMock.mockResolvedValue([
            { status: "PENDING", _count: { _all: 1 } },
            { status: "REJECTED", _count: { _all: 2 } },
        ]);

        const summary = await getFalsePositiveReviewSummary();

        expect(summary.total).toBe(3);
        expect(summary.pending).toBe(1);
        expect(summary.rejected).toBe(2);
        expect(summary.recentSubmissions).toHaveLength(1);
    });

    it("updates review status with reviewer metadata", async () => {
        updateMock.mockResolvedValue({
            id: "fp_1",
            scanId: "scan_1",
            owner: "acme",
            repo: "widget",
            findingFingerprint: "fp",
            findingIndex: 0,
            title: "Potential SQL Injection",
            severity: "high",
            type: "code",
            file: "src/api.ts",
            line: 42,
            confidence: "high",
            reason: "TEST_OR_FIXTURE",
            details: "This file is a seeded fixture and never ships to production.",
            isSharedView: false,
            status: "CONFIRMED_FALSE_POSITIVE",
            submittedByUserId: "user_1",
            submittedByUser: { githubLogin: "octocat" },
            reviewedByUser: { githubLogin: "testuser" },
            reviewedAt: new Date("2026-03-09T10:00:00.000Z"),
            createdAt: new Date("2026-03-09T09:00:00.000Z"),
            updatedAt: new Date("2026-03-09T10:00:00.000Z"),
        });

        const updated = await updateFalsePositiveStatus({
            submissionId: "fp_1",
            status: "CONFIRMED_FALSE_POSITIVE",
            reviewedByUserId: "admin_1",
        });

        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "fp_1" },
            data: expect.objectContaining({
                status: "CONFIRMED_FALSE_POSITIVE",
                reviewedByUserId: "admin_1",
                reviewedAt: expect.any(Date),
            }),
            include: expect.any(Object),
        });
        expect(updated.reviewedByGithubLogin).toBe("testuser");
    });
});
