import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
    getAuthSecret,
    getGitHubOAuthConfigError,
} from "@/lib/auth-env";
import { ensureDatabaseEnv } from "@/lib/resolve-db-env";

ensureDatabaseEnv();

export const dynamic = "force-dynamic";

export async function GET() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    const oauthError = getGitHubOAuthConfigError();
    checks.oauth = { ok: !oauthError, detail: oauthError ?? undefined };

    const authSecret = getAuthSecret();
    checks.authSecret = {
        ok: !!authSecret,
        detail: authSecret ? undefined : "AUTH_SECRET is not set",
    };

    const databaseUrl = process.env.DATABASE_URL?.trim();
    checks.databaseUrl = {
        ok: !!databaseUrl,
        detail: databaseUrl
            ? databaseUrl.includes("-pooler")
                ? "pooled"
                : "direct-or-unpooled"
            : "DATABASE_URL is not set (Neon pooled URL required on Vercel)",
    };

    const directUrl = process.env.DIRECT_URL?.trim();
    checks.directUrl = {
        ok: !!directUrl,
        detail: directUrl ? "set" : "DIRECT_URL is not set (Neon direct URL for migrations)",
    };

    try {
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 0`;
        await prisma.$queryRaw`SELECT 1 FROM "Account" LIMIT 0`;
        checks.database = { ok: true };
    } catch (error) {
        checks.database = {
            ok: false,
            detail: error instanceof Error ? error.message : "Database unreachable",
        };
    }

    const healthy = Object.values(checks).every((c) => c.ok);

    return NextResponse.json(
        {
            status: healthy ? "ok" : "degraded",
            appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
            checks,
        },
        { status: healthy ? 200 : 503 },
    );
}
