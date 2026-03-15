import {
    FindingGateDecision,
    FindingLifecycleStatus,
    FixVerificationRunStatus,
    type Prisma,
} from "@prisma/client";
import { kv } from "@vercel/kv";

import { prisma } from "@/lib/db";
import type { FindingVerificationRecord } from "@/lib/services/security-verification";

export interface StoredFindingVerificationRecord {
    id: string;
    scanId: string;
    owner: string;
    repo: string;
    findingFingerprint: string;
    findingIndex: number;
    lifecycleStatus: FindingLifecycleStatus;
    verificationStatus: FindingLifecycleStatus;
    gateDecision: FindingGateDecision;
    verificationScore: number | null;
    verificationSignals: unknown;
    verificationRationale: string | null;
    exploitabilityTag: string | null;
    closedAt: Date | null;
    reopenedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function saveScanFindingVerificationRecords(input: {
    scanId: string;
    owner: string;
    repo: string;
    records: FindingVerificationRecord[];
}): Promise<void> {
    if (input.records.length === 0) return;

    const fingerprints = Array.from(new Set(input.records.map((record) => record.findingFingerprint)));
    const latestPrior = await prisma.scanFindingVerification.findMany({
        where: {
            owner: input.owner,
            repo: input.repo,
            findingFingerprint: { in: fingerprints },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const latestByFingerprint = new Map<string, StoredFindingVerificationRecord>();
    for (const row of latestPrior) {
        if (!latestByFingerprint.has(row.findingFingerprint)) {
            latestByFingerprint.set(row.findingFingerprint, row);
        }
    }

    const now = new Date();
    const createRows: Prisma.ScanFindingVerificationCreateManyInput[] = input.records.map((record) => {
        const previous = latestByFingerprint.get(record.findingFingerprint);
        const isReopen = previous?.lifecycleStatus === "CLOSED" && record.lifecycleStatus === "OPEN";

        return {
            scanId: input.scanId,
            owner: input.owner,
            repo: input.repo,
            findingFingerprint: record.findingFingerprint,
            findingIndex: record.findingIndex,
            ruleId: record.finding.ruleId ?? null,
            title: record.finding.title,
            severity: record.finding.severity,
            type: record.finding.type,
            file: record.finding.file,
            line: record.finding.line ?? null,
            confidence: record.finding.confidence ?? null,
            verificationStatus: record.verificationStatus as FindingLifecycleStatus,
            lifecycleStatus: record.lifecycleStatus as FindingLifecycleStatus,
            gateDecision: record.gateDecision === "include" ? FindingGateDecision.INCLUDE : FindingGateDecision.EXCLUDE,
            verificationScore: record.verificationScore,
            verificationSignals: record.verificationSignals as unknown as Prisma.JsonArray,
            verificationRationale: record.verificationRationale,
            exploitabilityTag: record.exploitabilityTag ?? null,
            closedAt: record.lifecycleStatus === "CLOSED" ? now : null,
            reopenedAt: isReopen ? now : null,
            createdAt: now,
            updatedAt: now,
        };
    });

    await prisma.scanFindingVerification.createMany({
        data: createRows,
        skipDuplicates: true,
    });

    const reopenCount = createRows.filter((row) => row.reopenedAt !== null).length;
    if (reopenCount > 0) {
        try {
            await kv.incrby("stats:security_verification:reopened_total", reopenCount);
        } catch {
            // Metrics must never interrupt persistence.
        }
    }
}

export async function closeFindingLifecycleByFingerprint(input: {
    owner: string;
    repo: string;
    findingFingerprint: string;
}): Promise<number> {
    const result = await prisma.scanFindingVerification.updateMany({
        where: {
            owner: input.owner,
            repo: input.repo,
            findingFingerprint: input.findingFingerprint,
            lifecycleStatus: FindingLifecycleStatus.OPEN,
        },
        data: {
            lifecycleStatus: FindingLifecycleStatus.CLOSED,
            closedAt: new Date(),
            updatedAt: new Date(),
        },
    });
    return result.count;
}

export async function getLatestVerificationByFingerprint(input: {
    owner: string;
    repo: string;
    findingFingerprint: string;
}): Promise<StoredFindingVerificationRecord | null> {
    return prisma.scanFindingVerification.findFirst({
        where: {
            owner: input.owner,
            repo: input.repo,
            findingFingerprint: input.findingFingerprint,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getLatestOpenVerificationByFingerprint(findingFingerprint: string): Promise<StoredFindingVerificationRecord | null> {
    return prisma.scanFindingVerification.findFirst({
        where: {
            findingFingerprint,
            lifecycleStatus: FindingLifecycleStatus.OPEN,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function createFixVerificationRun(input: {
    scanId: string;
    findingFingerprint: string;
    owner: string;
    repo: string;
    changedFiles: string[];
    requestedByUserId?: string | null;
}) {
    return prisma.fixVerificationRun.create({
        data: {
            scanId: input.scanId,
            findingFingerprint: input.findingFingerprint,
            owner: input.owner,
            repo: input.repo,
            changedFiles: input.changedFiles as unknown as Prisma.JsonArray,
            status: FixVerificationRunStatus.PENDING,
            requestedByUserId: input.requestedByUserId ?? null,
        },
    });
}

export async function updateFixVerificationRun(
    runId: string,
    data: Prisma.FixVerificationRunUpdateInput
) {
    return prisma.fixVerificationRun.update({
        where: { id: runId },
        data,
    });
}

export async function getFixVerificationRun(runId: string) {
    return prisma.fixVerificationRun.findUnique({
        where: { id: runId },
    });
}
