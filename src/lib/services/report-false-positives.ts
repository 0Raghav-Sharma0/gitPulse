import type { ReportFalsePositiveReason, ReportFalsePositiveStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface CreateFalsePositiveSubmissionInput {
    scanId: string;
    owner: string;
    repo: string;
    findingFingerprint: string;
    findingIndex: number;
    title: string;
    severity: string;
    type: string;
    file: string;
    line?: number;
    confidence?: string;
    reason: ReportFalsePositiveReason;
    details: string;
    isSharedView: boolean;
    submittedByUserId?: string | null;
}

export interface FalsePositiveReviewRecord {
    id: string;
    scanId: string;
    owner: string;
    repo: string;
    findingFingerprint: string;
    findingIndex: number;
    title: string;
    severity: string;
    type: string;
    file: string;
    line: number | null;
    confidence: string | null;
    reason: ReportFalsePositiveReason;
    details: string;
    isSharedView: boolean;
    status: ReportFalsePositiveStatus;
    submittedByUserId: string | null;
    submittedByGithubLogin: string | null;
    reviewedByGithubLogin: string | null;
    reviewedAt: number | null;
    createdAt: number;
    updatedAt: number;
}

export interface FalsePositiveReviewSummary {
    total: number;
    pending: number;
    confirmedFalsePositive: number;
    rejected: number;
    recentSubmissions: FalsePositiveReviewRecord[];
}

function mapRecord(record: {
    id: string;
    scanId: string;
    owner: string;
    repo: string;
    findingFingerprint: string;
    findingIndex: number;
    title: string;
    severity: string;
    type: string;
    file: string;
    line: number | null;
    confidence: string | null;
    reason: ReportFalsePositiveReason;
    details: string;
    isSharedView: boolean;
    status: ReportFalsePositiveStatus;
    submittedByUserId: string | null;
    submittedByUser: { githubLogin: string | null } | null;
    reviewedByUser: { githubLogin: string | null } | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): FalsePositiveReviewRecord {
    return {
        id: record.id,
        scanId: record.scanId,
        owner: record.owner,
        repo: record.repo,
        findingFingerprint: record.findingFingerprint,
        findingIndex: record.findingIndex,
        title: record.title,
        severity: record.severity,
        type: record.type,
        file: record.file,
        line: record.line,
        confidence: record.confidence,
        reason: record.reason,
        details: record.details,
        isSharedView: record.isSharedView,
        status: record.status,
        submittedByUserId: record.submittedByUserId,
        submittedByGithubLogin: record.submittedByUser?.githubLogin ?? null,
        reviewedByGithubLogin: record.reviewedByUser?.githubLogin ?? null,
        reviewedAt: record.reviewedAt?.getTime() ?? null,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
    };
}

export async function createFalsePositiveSubmission(input: CreateFalsePositiveSubmissionInput) {
    return prisma.reportFalsePositive.create({
        data: {
            scanId: input.scanId,
            owner: input.owner,
            repo: input.repo,
            findingFingerprint: input.findingFingerprint,
            findingIndex: input.findingIndex,
            title: input.title,
            severity: input.severity,
            type: input.type,
            file: input.file,
            line: input.line ?? null,
            confidence: input.confidence ?? null,
            reason: input.reason,
            details: input.details,
            isSharedView: input.isSharedView,
            submittedByUserId: input.submittedByUserId ?? null,
        },
    });
}

export async function getFalsePositiveReviewSummary(limit = 50): Promise<FalsePositiveReviewSummary> {
    const [records, counts] = await Promise.all([
        prisma.reportFalsePositive.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                submittedByUser: {
                    select: { githubLogin: true },
                },
                reviewedByUser: {
                    select: { githubLogin: true },
                },
            },
        }),
        prisma.reportFalsePositive.groupBy({
            by: ["status"],
            _count: { _all: true },
        }),
    ]);

    const countMap = new Map(counts.map((row) => [row.status, row._count._all]));

    return {
        total: counts.reduce((sum, row) => sum + row._count._all, 0),
        pending: countMap.get("PENDING") ?? 0,
        confirmedFalsePositive: countMap.get("CONFIRMED_FALSE_POSITIVE") ?? 0,
        rejected: countMap.get("REJECTED") ?? 0,
        recentSubmissions: records.map(mapRecord),
    };
}

export async function updateFalsePositiveStatus(input: {
    submissionId: string;
    status: ReportFalsePositiveStatus;
    reviewedByUserId?: string | null;
}) {
    const record = await prisma.reportFalsePositive.update({
        where: { id: input.submissionId },
        data: {
            status: input.status,
            reviewedByUserId: input.reviewedByUserId ?? null,
            reviewedAt: new Date(),
        },
        include: {
            submittedByUser: {
                select: { githubLogin: true },
            },
            reviewedByUser: {
                select: { githubLogin: true },
            },
        },
    });

    return mapRecord(record);
}
