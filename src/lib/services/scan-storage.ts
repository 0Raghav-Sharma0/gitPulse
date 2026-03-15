import { prisma } from "@/lib/db";
import type { SecurityFinding, ScanSummary } from "@/lib/security-scanner";

export const SCAN_RETENTION_DAYS = 7;
const SCAN_RETENTION_MS = SCAN_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface StoredScan {
    id: string;
    owner: string;
    repo: string;
    timestamp: number;
    expiresAt: number;
    depth: "quick" | "deep";
    summary: ScanSummary;
    findings: SecurityFinding[];
    userId?: string;
}

export type ScanLookupResult =
    | { status: "ok"; scan: StoredScan }
    | { status: "expired"; scan: StoredScan }
    | { status: "not_found" };

function mapStoredScan(record: {
    id: string;
    owner: string;
    repo: string;
    timestamp: bigint;
    expiresAt: Date;
    depth: string;
    summary: unknown;
    findings: unknown;
    userId: string | null;
}): StoredScan {
    return {
        id: record.id,
        owner: record.owner,
        repo: record.repo,
        timestamp: Number(record.timestamp),
        expiresAt: record.expiresAt.getTime(),
        depth: record.depth === "deep" ? "deep" : "quick",
        summary: record.summary as ScanSummary,
        findings: record.findings as SecurityFinding[],
        userId: record.userId ?? undefined,
    };
}

export function isScanExpired(scan: Pick<StoredScan, "expiresAt">): boolean {
    return scan.expiresAt <= Date.now();
}

export async function saveScanResult(
    owner: string,
    repo: string,
    data: {
        depth: "quick" | "deep";
        summary: ScanSummary;
        findings: SecurityFinding[];
    },
    userId?: string
): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const expiresAt = timestamp + SCAN_RETENTION_MS;

    const record: StoredScan = {
        id,
        owner,
        repo,
        timestamp,
        expiresAt,
        userId,
        ...data,
    };

    await prisma.repoScan.create({
        data: {
            id: record.id,
            owner: record.owner,
            repo: record.repo,
            timestamp: BigInt(record.timestamp),
            expiresAt: new Date(record.expiresAt),
            depth: record.depth,
            summary: record.summary as object,
            findings: record.findings as unknown as object[],
            userId: record.userId ?? null,
        },
    });

    return id;
}

export async function getScanResultWithStatus(id: string): Promise<ScanLookupResult> {
    const record = await prisma.repoScan.findUnique({ where: { id } });
    if (!record) {
        return { status: "not_found" };
    }

    const scan = mapStoredScan(record);
    if (isScanExpired(scan)) {
        return { status: "expired", scan };
    }

    return { status: "ok", scan };
}

export async function getScanResult(id: string): Promise<StoredScan | null> {
    const result = await getScanResultWithStatus(id);
    return result.status === "ok" ? result.scan : null;
}

export async function getLatestScanId(owner: string, repo: string): Promise<string | null> {
    const now = new Date();
    const latest = await prisma.repoScan.findFirst({
        where: {
            owner,
            repo,
            expiresAt: { gt: now },
        },
        orderBy: { timestamp: "desc" },
        select: { id: true },
    });
    return latest?.id ?? null;
}

export async function getPreviousScan(
    owner: string,
    repo: string,
    currentScanId: string,
    currentTimestamp?: number
): Promise<StoredScan | null> {
    let resolvedTimestamp = currentTimestamp;

    if (typeof resolvedTimestamp !== "number") {
        const current = await getScanResult(currentScanId);
        if (!current) return null;
        resolvedTimestamp = current.timestamp;
    }

    const previous = await prisma.repoScan.findFirst({
        where: {
            owner,
            repo,
            id: { not: currentScanId },
            timestamp: { lt: BigInt(resolvedTimestamp) },
            expiresAt: { gt: new Date() },
        },
        orderBy: { timestamp: "desc" },
    });

    return previous ? mapStoredScan(previous) : null;
}

export async function getUserScans(userId: string, limit?: number): Promise<StoredScan[]> {
    const scans = await prisma.repoScan.findMany({
        where: {
            userId,
            expiresAt: { gt: new Date() },
        },
        orderBy: { timestamp: "desc" },
        ...(typeof limit === "number" && limit > 0 ? { take: limit } : {}),
    });
    return scans.map(mapStoredScan);
}
