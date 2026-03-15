import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { kv } from "@vercel/kv";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

function parseArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function toDate(value, fallback) {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for ${value}`);
  }
  return d;
}

async function estimateWindow(from, to) {
  const fromMs = BigInt(from.getTime());
  const toMs = BigInt(to.getTime());

  const [recentSearches, repoScans, convoUsers, searchUsers] = await Promise.all([
    prisma.recentSearch.findMany({
      where: { timestamp: { gte: fromMs, lte: toMs } },
      select: { userId: true },
    }),
    prisma.repoScan.findMany({
      where: { createdAt: { gte: from, lte: to }, userId: { not: null } },
      select: { userId: true },
    }),
    prisma.chatConversation.findMany({
      where: { updatedAt: { gte: from, lte: to } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.recentSearch.count({
      where: { timestamp: { gte: fromMs, lte: toMs } },
    }),
  ]);

  const scanCount = repoScans.length;
  const queryEstimate = searchUsers + scanCount;

  const users = new Set([
    ...recentSearches.map((r) => r.userId),
    ...repoScans.map((r) => r.userId).filter(Boolean),
    ...convoUsers.map((r) => r.userId),
  ]);

  return {
    estimatedVisitors: users.size,
    estimatedQueries: queryEstimate,
    breakdown: {
      recentSearchRows: searchUsers,
      repoScans: scanCount,
      distinctConversationUsers: convoUsers.length,
    },
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const from = toDate(parseArg("--from"), defaultFrom);
  const to = toDate(parseArg("--to"), now);

  if (from >= to) {
    throw new Error("--from must be before --to");
  }

  const estimate = await estimateWindow(from, to);

  console.log("Analytics gap estimate");
  console.log(JSON.stringify({
    from: from.toISOString(),
    to: to.toISOString(),
    ...estimate,
    caveat: "Estimate is based on persisted authenticated activity (searches/scans/conversations) and may undercount anonymous traffic.",
  }, null, 2));

  if (apply) {
    await Promise.all([
      kv.incrby("stats:adjustment:visitors", estimate.estimatedVisitors),
      kv.incrby("stats:adjustment:queries", estimate.estimatedQueries),
    ]);
    console.log("Applied adjustments to KV keys stats:adjustment:visitors and stats:adjustment:queries");
  } else {
    console.log("Dry run only. Re-run with --apply to persist adjustments.");
  }
}

main()
  .catch((error) => {
    console.error("Failed to estimate analytics gap:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
