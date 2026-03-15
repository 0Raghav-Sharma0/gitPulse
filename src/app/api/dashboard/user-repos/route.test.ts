import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

import { GET } from "@/app/api/dashboard/user-repos/route";

describe("GET /api/dashboard/user-repos", () => {
    beforeEach(() => {
        authMock.mockReset();
    });

    it("returns INVALID_SESSION when user exists without id", async () => {
        authMock.mockResolvedValue({
            user: { name: "User", email: "user@example.com" },
        });

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({
            error: "Unauthorized",
            code: "INVALID_SESSION",
        });
    });
});
