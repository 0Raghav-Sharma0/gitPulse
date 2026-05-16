import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGitHubOAuthConfigError } from "@/lib/auth-env";

export const dynamic = "force-dynamic";

export async function GET() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    const oauthError = getGitHubOAuthConfigError();
    checks.oauth = { ok: !oauthError, detail: oauthError ?? undefined };

    try {
        await prisma.$queryRaw`SELECT 1`;
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
