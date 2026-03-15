import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanSummary } from "@/lib/security-scanner";

const { findUniqueMock, findFirstMock } = vi.hoisted(() => ({
    findUniqueMock: vi.fn(),
    findFirstMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    prisma: {
        repoScan: {
            findUnique: findUniqueMock,
            findFirst: findFirstMock,
        },
    },
}));

import { getPreviousScan } from "@/lib/services/scan-storage";

function buildDbScan(overrides: Record<string, unknown>) {
    const summary: ScanSummary = {
        total: 1,
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
        info: 0,
    };
    return {
        id: "scan-id",
        owner: "acme",
        repo: "widget",
        timestamp: BigInt(1000),
        expiresAt: new Date(Date.now() + 60_000),
        depth: "quick",
        summary,
        findings: [],
        userId: null,
        ...overrides,
    };
}

describe("getPreviousScan", () => {
    beforeEach(() => {
        findUniqueMock.mockReset();
        findFirstMock.mockReset();
    });

    it("returns previous scan from repository history", async () => {
        findFirstMock.mockResolvedValue(buildDbScan({ id: "older-a", timestamp: BigInt(1700) }));

        const result = await getPreviousScan("acme", "widget", "current", 1800);
        expect(result?.id).toBe("older-a");
        expect(findFirstMock).toHaveBeenCalledOnce();
    });

    it("loads current scan when timestamp is omitted", async () => {
        findUniqueMock.mockResolvedValue(buildDbScan({ id: "current", timestamp: BigInt(2000) }));
        findFirstMock.mockResolvedValue(buildDbScan({ id: "older-b", timestamp: BigInt(1700) }));

        const result = await getPreviousScan("acme", "widget", "current");
        expect(result?.id).toBe("older-b");
        expect(findUniqueMock).toHaveBeenCalledOnce();
        expect(findFirstMock).toHaveBeenCalledOnce();
    });
});
