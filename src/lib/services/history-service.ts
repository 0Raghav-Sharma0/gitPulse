import { prisma } from "@/lib/db";

export interface SearchHistoryItem {
    query: string;
    type: "profile" | "repo";
    timestamp: number;
}

export async function recordSearch(userId: string, query: string, type: "profile" | "repo") {
    const now = Date.now();
    await prisma.recentSearch.upsert({
        where: {
            userId_query: {
                userId,
                query,
            },
        },
        update: {
            type,
            timestamp: BigInt(now),
        },
        create: {
            userId,
            query,
            type,
            timestamp: BigInt(now),
        },
    });

    const staleRows = await prisma.recentSearch.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
        skip: 10,
        select: { id: true },
    });

    if (staleRows.length > 0) {
        await prisma.recentSearch.deleteMany({
            where: {
                id: { in: staleRows.map((row) => row.id) },
            },
        });
    }
}

export async function getRecentSearches(userId: string, limit: number = 3): Promise<SearchHistoryItem[]> {
    const rows = await prisma.recentSearch.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
        take: Math.max(limit, 0),
    });

    return rows.map((row) => ({
        query: row.query,
        type: row.type === "repo" ? "repo" : "profile",
        timestamp: Number(row.timestamp),
    }));
}
