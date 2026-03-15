import { describe, expect, it, vi, beforeEach } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    redirectMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("next/navigation", () => ({
    redirect: redirectMock,
}));

import DashboardPage from "@/app/dashboard/page";

describe("DashboardPage auth redirects", () => {
    beforeEach(() => {
        authMock.mockReset();
        redirectMock.mockReset();
        redirectMock.mockImplementation(() => {
            throw new Error("redirect");
        });
    });

    it("redirects to force-signout when session user exists without id", async () => {
        authMock.mockResolvedValue({
            user: { name: "User", email: "user@example.com" },
        });

        await expect(DashboardPage()).rejects.toThrow("redirect");
        expect(redirectMock).toHaveBeenCalledWith(
            "/api/internal/auth/force-signout?callbackUrl=%2F%3Ferror%3Dinvalid_session"
        );
    });
});
