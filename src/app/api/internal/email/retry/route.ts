import { NextRequest, NextResponse } from "next/server";
import { processTransactionalEmailRetries } from "@/lib/emails/delivery-service";

function getAllowedSecrets(): string[] {
    const secrets = [process.env.EMAIL_RETRY_JOB_SECRET?.trim()].filter(
        (value): value is string => Boolean(value)
    );

    return Array.from(new Set(secrets));
}

function isAuthorized(request: NextRequest, allowedSecrets: string[]): boolean {
    if (allowedSecrets.length === 0) {
        return false;
    }

    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
    const headerToken = request.headers.get("x-job-secret");
    const token = bearerToken || headerToken;

    return !!token && allowedSecrets.includes(token);
}

async function handleRetry(request: NextRequest) {
    const allowedSecrets = getAllowedSecrets();
    if (allowedSecrets.length === 0) {
        return NextResponse.json({ error: "EMAIL_RETRY_JOB_SECRET is not configured" }, { status: 500 });
    }

    if (!isAuthorized(request, allowedSecrets)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 25;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 25;

    const result = await processTransactionalEmailRetries(limit);
    return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
    return handleRetry(request);
}

export async function POST(request: NextRequest) {
    return handleRetry(request);
}
