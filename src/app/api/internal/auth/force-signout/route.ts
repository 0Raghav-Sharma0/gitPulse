import { NextRequest, NextResponse } from "next/server";
import { INVALID_SESSION_REDIRECT_PATH } from "@/lib/session-guard";

const AUTH_COOKIE_PREFIXES = [
    "authjs.",
    "__Secure-authjs.",
    "next-auth.",
    "__Secure-next-auth.",
];

function getSafeCallbackPath(rawValue: string | null): string {
    if (!rawValue) {
        return INVALID_SESSION_REDIRECT_PATH;
    }

    // Only allow local absolute paths for redirect safety.
    if (!rawValue.startsWith("/")) {
        return INVALID_SESSION_REDIRECT_PATH;
    }

    return rawValue;
}

export async function GET(request: NextRequest) {
    const callbackPath = getSafeCallbackPath(request.nextUrl.searchParams.get("callbackUrl"));
    const response = NextResponse.redirect(new URL(callbackPath, request.url));

    for (const cookie of request.cookies.getAll()) {
        if (!AUTH_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix))) {
            continue;
        }

        response.cookies.set({
            name: cookie.name,
            value: "",
            path: "/",
            httpOnly: true,
            expires: new Date(0),
            maxAge: 0,
            secure: cookie.name.startsWith("__Secure-"),
        });
    }

    return response;
}
