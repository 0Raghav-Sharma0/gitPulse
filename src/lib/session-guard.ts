import type { Session } from "next-auth";

export const INVALID_SESSION_ERROR_CODE = "INVALID_SESSION";
export const INVALID_SESSION_ERROR_PARAM = "invalid_session";
export const INVALID_SESSION_REDIRECT_PATH = `/?error=${INVALID_SESSION_ERROR_PARAM}`;

export type SessionAuthState = "authenticated" | "unauthenticated" | "invalid";

export function getSessionUserId(session: Session | null | undefined): string | null {
    const rawUserId = session?.user?.id;
    if (typeof rawUserId !== "string") {
        return null;
    }

    const userId = rawUserId.trim();
    return userId.length > 0 ? userId : null;
}

export function getSessionAuthState(session: Session | null | undefined): SessionAuthState {
    if (!session?.user) {
        return "unauthenticated";
    }
    return getSessionUserId(session) ? "authenticated" : "invalid";
}

export function buildInvalidSessionSignOutRedirect(
    callbackUrl: string = INVALID_SESSION_REDIRECT_PATH
): string {
    return `/api/internal/auth/force-signout?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function getInvalidSessionApiError() {
    return {
        error: "Unauthorized",
        code: INVALID_SESSION_ERROR_CODE,
    };
}
