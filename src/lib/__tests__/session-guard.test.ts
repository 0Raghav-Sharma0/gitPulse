import { describe, expect, it } from "vitest";
import {
    INVALID_SESSION_ERROR_PARAM,
    buildInvalidSessionSignOutRedirect,
    getSessionAuthState,
    getSessionUserId,
} from "@/lib/session-guard";

describe("session-guard", () => {
    it("returns unauthenticated when session is missing", () => {
        expect(getSessionAuthState(null)).toBe("unauthenticated");
    });

    it("returns invalid when user exists but id is missing", () => {
        expect(getSessionAuthState({ user: { name: "Test" } } as never)).toBe("invalid");
    });

    it("returns authenticated and extracts user id", () => {
        const session = { user: { id: "user_123", name: "Test" } } as never;
        expect(getSessionAuthState(session)).toBe("authenticated");
        expect(getSessionUserId(session)).toBe("user_123");
    });

    it("builds force-signout redirect with encoded callback", () => {
        const target = `/?error=${INVALID_SESSION_ERROR_PARAM}`;
        expect(buildInvalidSessionSignOutRedirect(target)).toBe(
            "/api/internal/auth/force-signout?callbackUrl=%2F%3Ferror%3Dinvalid_session"
        );
    });
});
