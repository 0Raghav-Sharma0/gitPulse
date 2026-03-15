import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    createMock,
    findUniqueMock,
    updateMock,
    updateManyMock,
} = vi.hoisted(() => ({
    createMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    updateManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    prisma: {
        repoScanShareLink: {
            create: createMock,
            findUnique: findUniqueMock,
            update: updateMock,
            updateMany: updateManyMock,
        },
    },
}));

import {
    createScanShareLink,
    hashShareToken,
    resolveScanFromShareToken,
    revokeScanShareLink,
} from "@/lib/services/scan-share-links";

describe("scan-share-links", () => {
    beforeEach(() => {
        createMock.mockReset();
        findUniqueMock.mockReset();
        updateMock.mockReset();
        updateManyMock.mockReset();
    });

    it("creates signed links with hashed token and expiry", async () => {
        findUniqueMock.mockResolvedValueOnce(null);
        createMock.mockImplementation(({ data }) => ({
            id: "link_123",
            createdAt: new Date("2026-03-08T00:00:00.000Z"),
            expiresAt: data.expiresAt,
        }));

        const result = await createScanShareLink({
            scanId: "scan_1",
            createdByUserId: "user_1",
            ttlDays: 14,
        });

        expect(result.linkId).toBe("link_123");
        expect(result.token.length).toBeGreaterThan(20);
        expect(createMock).toHaveBeenCalledOnce();

        const call = createMock.mock.calls[0]?.[0];
        expect(call?.data?.scanId).toBe("scan_1");
        expect(call?.data?.createdByUserId).toBe("user_1");
        expect(call?.data?.tokenHash).toHaveLength(64);
        expect(result.token).toBe(call?.data?.tokenHash);
    });

    it("reuses existing canonical link for the same scan", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "link_existing",
            tokenHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            expiresAt: new Date(Date.now() + 60_000),
            createdAt: new Date("2026-03-08T00:00:00.000Z"),
            revokedAt: null,
        });

        const result = await createScanShareLink({
            scanId: "scan_1",
        });

        expect(result.linkId).toBe("link_existing");
        expect(result.token).toBe("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        expect(createMock).not.toHaveBeenCalled();
    });

    it("refreshes expired canonical links instead of creating a second link", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "link_existing",
            tokenHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            expiresAt: new Date(Date.now() - 60_000),
            createdAt: new Date("2026-03-08T00:00:00.000Z"),
            revokedAt: null,
        });
        updateMock.mockResolvedValueOnce({
            id: "link_existing",
            tokenHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            expiresAt: new Date(Date.now() + 60_000),
            createdAt: new Date("2026-03-08T00:00:00.000Z"),
        });

        const result = await createScanShareLink({
            scanId: "scan_1",
        });

        expect(result.linkId).toBe("link_existing");
        expect(updateMock).toHaveBeenCalledOnce();
        expect(createMock).not.toHaveBeenCalled();
    });

    it("resolves active share token and increments access count", async () => {
        const token = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        findUniqueMock.mockResolvedValueOnce({
            id: "link_1",
            scanId: "scan_1",
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
        });

        const result = await resolveScanFromShareToken(token);
        expect(result).toEqual({
            status: "ok",
            linkId: "link_1",
            scanId: "scan_1",
            expiresAt: expect.any(Date),
        });
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { tokenHash: token },
            select: {
                id: true,
                scanId: true,
                expiresAt: true,
                revokedAt: true,
            },
        });
        expect(updateMock).toHaveBeenCalledOnce();
    });

    it("returns invalid/expired/revoked token states", async () => {
        const invalid = await resolveScanFromShareToken("short");
        expect(invalid).toEqual({ status: "invalid" });
        expect(findUniqueMock).not.toHaveBeenCalled();

        findUniqueMock
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        const notFound = await resolveScanFromShareToken("abcdefghijklmnopqrstuvwx_0123456789ABCD");
        expect(notFound).toEqual({ status: "invalid" });
        expect(findUniqueMock).toHaveBeenNthCalledWith(2, {
            where: { tokenHash: hashShareToken("abcdefghijklmnopqrstuvwx_0123456789ABCD") },
            select: {
                id: true,
                scanId: true,
                expiresAt: true,
                revokedAt: true,
            },
        });

        findUniqueMock
            .mockResolvedValueOnce({
                id: "link_expired",
                scanId: "scan_1",
                expiresAt: new Date(Date.now() - 5_000),
                revokedAt: null,
            });
        const expired = await resolveScanFromShareToken("abcdefghijklmnopqrstuvwx_0123456789ABCD");
        expect(expired).toEqual({ status: "expired" });

        findUniqueMock.mockResolvedValueOnce({
            id: "link_revoked",
            scanId: "scan_1",
            expiresAt: new Date(Date.now() + 5_000),
            revokedAt: new Date(),
        });
        const revoked = await resolveScanFromShareToken("abcdefghijklmnopqrstuvwx_0123456789ABCD");
        expect(revoked).toEqual({ status: "revoked" });
    });

    it("revokes active share links", async () => {
        updateManyMock.mockResolvedValueOnce({ count: 1 });
        const success = await revokeScanShareLink("link_1");
        expect(success).toBe(true);

        updateManyMock.mockResolvedValueOnce({ count: 0 });
        const failed = await revokeScanShareLink("link_1");
        expect(failed).toBe(false);
    });
});
