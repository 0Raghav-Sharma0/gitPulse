import { config } from "dotenv";
import { kv } from "@vercel/kv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient();
const userIdCache = new Map();

function parseTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
}

function parseDepth(value) {
    return value === "deep" ? "deep" : "quick";
}

function parseSearchType(value) {
    return value === "repo" ? "repo" : "profile";
}

async function resolveUserId(legacyUserId) {
    if (!legacyUserId || typeof legacyUserId !== "string") return null;
    if (userIdCache.has(legacyUserId)) {
        return userIdCache.get(legacyUserId);
    }

    const existingUser = await prisma.user.findUnique({
        where: { id: legacyUserId },
        select: { id: true },
    });
    if (existingUser) {
        userIdCache.set(legacyUserId, existingUser.id);
        return existingUser.id;
    }

    const githubAccount = await prisma.account.findFirst({
        where: {
            provider: "github",
            providerAccountId: legacyUserId,
        },
        select: { userId: true },
    });

    if (githubAccount?.userId) {
        userIdCache.set(legacyUserId, githubAccount.userId);
        return githubAccount.userId;
    }

    // Legacy KV records used pre-adapter GitHub IDs. Create a minimal placeholder
    // user/account pair so historical rows can be attached and later reused at sign-in.
    await prisma.user.upsert({
        where: { id: legacyUserId },
        update: {},
        create: { id: legacyUserId },
    });
    await prisma.account.upsert({
        where: {
            provider_providerAccountId: {
                provider: "github",
                providerAccountId: legacyUserId,
            },
        },
        update: {
            userId: legacyUserId,
            type: "oauth",
        },
        create: {
            userId: legacyUserId,
            type: "oauth",
            provider: "github",
            providerAccountId: legacyUserId,
        },
    });

    const resolved = legacyUserId;
    userIdCache.set(legacyUserId, resolved);
    return resolved;
}

async function backfillScans() {
    const scanKeys = await kv.keys("scan:*");
    let migrated = 0;
    let skipped = 0;

    for (const key of scanKeys) {
        const raw = await kv.get(key);
        if (!raw || typeof raw !== "object") {
            skipped += 1;
            continue;
        }

        const id = typeof raw.id === "string" ? raw.id : null;
        const owner = typeof raw.owner === "string" ? raw.owner : null;
        const repo = typeof raw.repo === "string" ? raw.repo : null;
        if (!id || !owner || !repo) {
            skipped += 1;
            continue;
        }

        const userId = await resolveUserId(raw.userId);
        const data = {
            id,
            owner,
            repo,
            timestamp: BigInt(parseTimestamp(raw.timestamp)),
            depth: parseDepth(raw.depth),
            summary: typeof raw.summary === "object" && raw.summary ? raw.summary : {},
            findings: Array.isArray(raw.findings) ? raw.findings : [],
            userId,
        };

        await prisma.repoScan.upsert({
            where: { id },
            update: data,
            create: data,
        });

        migrated += 1;
    }

    return { migrated, skipped };
}

async function backfillRecentSearches() {
    const searchKeys = await kv.keys("user:*:recent_searches");
    let migrated = 0;
    let skipped = 0;

    for (const key of searchKeys) {
        const parts = key.split(":");
        const legacyUserId = parts[1];
        const userId = await resolveUserId(legacyUserId);
        if (!userId) {
            skipped += 1;
            continue;
        }

        const items = await kv.lrange(key, 0, 200);
        for (const item of items) {
            if (!item || typeof item !== "object" || typeof item.query !== "string") {
                continue;
            }

            await prisma.recentSearch.upsert({
                where: {
                    userId_query: {
                        userId,
                        query: item.query,
                    },
                },
                update: {
                    type: parseSearchType(item.type),
                    timestamp: BigInt(parseTimestamp(item.timestamp)),
                },
                create: {
                    userId,
                    query: item.query,
                    type: parseSearchType(item.type),
                    timestamp: BigInt(parseTimestamp(item.timestamp)),
                },
            });
            migrated += 1;
        }

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

    return { migrated, skipped };
}

function parseChatKey(key) {
    const parts = key.split(":");
    if (parts.length < 4 || parts[0] !== "chat") return null;

    const legacyUserId = parts[1];
    if (parts[2] === "profile") {
        const username = parts.slice(3).join(":");
        if (!username) return null;
        return {
            legacyUserId,
            scope: "profile",
            conversationKey: `profile:${username}`,
            owner: null,
            repo: null,
            username,
        };
    }

    const owner = parts[2];
    const repo = parts.slice(3).join(":");
    if (!owner || !repo) return null;
    return {
        legacyUserId,
        scope: "repo",
        conversationKey: `repo:${owner}:${repo}`,
        owner,
        repo,
        username: null,
    };
}

async function backfillChatConversations() {
    const chatKeys = await kv.keys("chat:*");
    let migrated = 0;
    let skipped = 0;

    for (const key of chatKeys) {
        const parsed = parseChatKey(key);
        if (!parsed) {
            skipped += 1;
            continue;
        }

        const userId = await resolveUserId(parsed.legacyUserId);
        if (!userId) {
            skipped += 1;
            continue;
        }

        const messages = await kv.get(key);
        if (!Array.isArray(messages)) {
            skipped += 1;
            continue;
        }

        await prisma.chatConversation.upsert({
            where: {
                userId_conversationKey: {
                    userId,
                    conversationKey: parsed.conversationKey,
                },
            },
            update: {
                scope: parsed.scope,
                owner: parsed.owner,
                repo: parsed.repo,
                username: parsed.username,
                messages,
            },
            create: {
                userId,
                conversationKey: parsed.conversationKey,
                scope: parsed.scope,
                owner: parsed.owner,
                repo: parsed.repo,
                username: parsed.username,
                messages,
            },
        });
        migrated += 1;
    }

    return { migrated, skipped };
}

async function main() {
    console.log("Starting KV -> Postgres backfill...");

    const scanStats = await backfillScans();
    console.log(`Scans: migrated=${scanStats.migrated}, skipped=${scanStats.skipped}`);

    const searchStats = await backfillRecentSearches();
    console.log(`Recent searches: migrated=${searchStats.migrated}, skippedUsers=${searchStats.skipped}`);

    const chatStats = await backfillChatConversations();
    console.log(`Chat conversations: migrated=${chatStats.migrated}, skipped=${chatStats.skipped}`);

    console.log("Backfill completed.");
}

main()
    .catch((error) => {
        console.error("Backfill failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
