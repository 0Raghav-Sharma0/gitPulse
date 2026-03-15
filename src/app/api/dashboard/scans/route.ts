import { auth } from "@/lib/auth";
import { getUserScans } from "@/lib/services/scan-storage";
import { NextRequest, NextResponse } from "next/server";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

export async function GET(request: NextRequest) {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authState === "invalid") {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    const userId = getSessionUserId(session);
    if (!userId) {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    try {
        const limitParam = request.nextUrl.searchParams.get("limit");
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
        const limit = typeof parsedLimit === "number" && Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 50)
            : undefined;
        const scans = await getUserScans(userId, limit);
        return NextResponse.json({ scans });
    } catch {
        return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
    }
}
