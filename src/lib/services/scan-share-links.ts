import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const DEFAULT_SCAN_SHARE_TTL_DAYS = 7;
const MIN_TOKEN_LENGTH = 24;

export type ScanShareResolution =
    | { status: "ok"; linkId: string; scanId: string; expiresAt: Date }
    | { status: "invalid" | "expired" | "revoked" };

function normalizeTtlDays(ttlDays?: number): number {
    const value = typeof ttlDays === "number" ? Math.floor(ttlDays) : DEFAULT_SCAN_SHARE_TTL_DAYS;
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_SCAN_SHARE_TTL_DAYS;
    return Math.min(value, 90);
}

function createShareToken(): string {
    // 32 bytes -> URL-safe token with enough entropy for public links.
    return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function isPlausibleToken(token: string): boolean {
    return /^[A-Za-z0-9_-]+$/.test(token) && token.length >= MIN_TOKEN_LENGTH;
}

export async function createScanShareLink(params: {
    scanId: string;
    createdByUserId?: string | null;
    canonicalExpiresAt?: Date;
    ttlDays?: number;
}): Promise<{ linkId: string; token: string; expiresAt: Date; createdAt: Date }> {
    const existing = await prisma.repoScanShareLink.findUnique({
        where: { scanId: params.scanId },
        select: {
            id: true,
            tokenHash: true,
            expiresAt: true,
            createdAt: true,
            revokedAt: true,
        },
    });
    const ttlDays = normalizeTtlDays(params.ttlDays);
    const canonicalExpiresAt = params.canonicalExpiresAt
        ? new Date(params.canonicalExpiresAt)
        : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    if (existing && existing.expiresAt.getTime() > Date.now() && !existing.revokedAt) {
        return {
            linkId: existing.id,
            token: existing.tokenHash,
            expiresAt: existing.expiresAt,
            createdAt: existing.createdAt,
        };
    }

    if (existing) {
        const refreshed = await prisma.repoScanShareLink.update({
            where: { id: existing.id },
            data: {
                expiresAt: canonicalExpiresAt,
                revokedAt: null,
            },
            select: {
                id: true,
                createdAt: true,
                expiresAt: true,
                tokenHash: true,
            },
        });
        return {
            linkId: refreshed.id,
            token: refreshed.tokenHash,
            expiresAt: refreshed.expiresAt,
            createdAt: refreshed.createdAt,
        };
    }

    const tokenHash = hashShareToken(createShareToken());

    const link = await prisma.repoScanShareLink.create({
        data: {
            scanId: params.scanId,
            tokenHash,
            expiresAt: canonicalExpiresAt,
            createdByUserId: params.createdByUserId ?? null,
        },
        select: {
            id: true,
            createdAt: true,
            expiresAt: true,
        },
    });

    return {
        linkId: link.id,
        token: tokenHash,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
    };
}

export async function resolveScanFromShareToken(token: string): Promise<ScanShareResolution> {
    if (!isPlausibleToken(token)) {
        return { status: "invalid" };
    }

    let link = await prisma.repoScanShareLink.findUnique({
        where: { tokenHash: token },
        select: {
            id: true,
            scanId: true,
            expiresAt: true,
            revokedAt: true,
        },
    });
    if (!link) {
        // Backwards compatibility for previously issued raw tokens.
        const tokenHash = hashShareToken(token);
        link = await prisma.repoScanShareLink.findUnique({
            where: { tokenHash },
            select: {
                id: true,
                scanId: true,
                expiresAt: true,
                revokedAt: true,
            },
        });
    }

    if (!link) {
        return { status: "invalid" };
    }
    if (link.revokedAt) {
        return { status: "revoked" };
    }
    if (link.expiresAt.getTime() <= Date.now()) {
        return { status: "expired" };
    }

    await prisma.repoScanShareLink.update({
        where: { id: link.id },
        data: {
            accessCount: { increment: 1 },
            lastAccessedAt: new Date(),
        },
    });

    return {
        status: "ok",
        linkId: link.id,
        scanId: link.scanId,
        expiresAt: link.expiresAt,
    };
}

export async function getScanShareLinkById(linkId: string) {
    return prisma.repoScanShareLink.findUnique({
        where: { id: linkId },
        select: {
            id: true,
            scanId: true,
            createdByUserId: true,
            revokedAt: true,
            expiresAt: true,
        },
    });
}

export async function revokeScanShareLink(linkId: string): Promise<boolean> {
    const result = await prisma.repoScanShareLink.updateMany({
        where: {
            id: linkId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });
    return result.count > 0;
}
