import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-oauth-db", () => ({
    getGithubAccessTokenForUser: vi.fn().mockResolvedValue(undefined),
    resolveLinkedUserId: vi.fn().mockResolvedValue(undefined),
    linkGithubOAuthUser: vi.fn(),
}));

import authConfig from "@/lib/auth.config";
import { resolveLinkedUserId } from "@/lib/auth-oauth-db";
import { INVALID_SESSION_ERROR_CODE } from "@/lib/session-guard";

describe("auth.config callbacks", () => {
    beforeEach(() => {
        vi.mocked(resolveLinkedUserId).mockReset();
        vi.mocked(resolveLinkedUserId).mockResolvedValue(undefined);
    });

    it("does not use token.sub as the Prisma user id", async () => {
        const jwt = authConfig.callbacks?.jwt;
        expect(jwt).toBeTypeOf("function");

        const result = await jwt?.({
            token: { sub: "168120496" },
            profile: undefined,
            account: undefined,
            user: undefined,
            trigger: "update",
            session: null,
            isNewUser: false,
        } as never);

        expect(result?.id).toBeUndefined();
        expect(result?.error).toBe(INVALID_SESSION_ERROR_CODE);
    });

    it("marks session as invalid when no user id can be resolved", async () => {
        const session = authConfig.callbacks?.session;
        expect(session).toBeTypeOf("function");

        const result = await session?.({
            session: {
                expires: "2099-01-01T00:00:00.000Z",
                user: {
                    name: "Test",
                    email: "test@example.com",
                    image: null,
                },
            },
            token: {},
            user: undefined,
            newSession: undefined,
            trigger: "update",
        } as never);

        const resultWithError = result as { error?: string } | undefined;
        expect(resultWithError?.error).toBe(INVALID_SESSION_ERROR_CODE);
    });
});
