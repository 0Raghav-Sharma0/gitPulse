import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    isAdminUserMock,
    resetReportConversionMetricsMock,
    userFindUniqueMock,
    userDeleteMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    isAdminUserMock: vi.fn(),
    resetReportConversionMetricsMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    userDeleteMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/lib/admin-auth", () => ({
    isAdminUser: isAdminUserMock,
}));

vi.mock("@/lib/analytics", async () => {
    const actual = await vi.importActual<typeof import("@/lib/analytics")>("@/lib/analytics");
    return {
        ...actual,
        resetReportConversionMetrics: resetReportConversionMetricsMock,
    };
});

vi.mock("@/lib/db", () => ({
    prisma: {
        user: {
            findUnique: userFindUniqueMock,
            delete: userDeleteMock,
        },
    },
}));

import { deleteLoggedInUserAccount, resetAdminReportFunnel } from "@/app/actions";

describe("admin actions", () => {
    beforeEach(() => {
        authMock.mockReset();
        isAdminUserMock.mockReset();
        resetReportConversionMetricsMock.mockReset();
        userFindUniqueMock.mockReset();
        userDeleteMock.mockReset();

        authMock.mockResolvedValue({ user: { id: "admin_1", username: "403errors" } });
        isAdminUserMock.mockReturnValue(true);
    });

    it("resets the report funnel for admins", async () => {
        await expect(resetAdminReportFunnel()).resolves.toEqual({ ok: true });
        expect(resetReportConversionMetricsMock).toHaveBeenCalledOnce();
    });

    it("rejects report funnel resets for non-admins", async () => {
        isAdminUserMock.mockReturnValue(false);

        await expect(resetAdminReportFunnel()).rejects.toThrow("Forbidden");
        expect(resetReportConversionMetricsMock).not.toHaveBeenCalled();
    });

    it("deletes incomplete accounts", async () => {
        userFindUniqueMock.mockResolvedValue({
            id: "user_2",
            email: null,
            githubLogin: "octocat-shadow",
        });

        await expect(deleteLoggedInUserAccount({ userId: "user_2" })).resolves.toEqual({
            ok: true,
            deletedUserId: "user_2",
        });

        expect(userDeleteMock).toHaveBeenCalledWith({
            where: { id: "user_2" },
        });
    });

    it("blocks deleting complete accounts", async () => {
        userFindUniqueMock.mockResolvedValue({
            id: "user_2",
            email: "user@example.com",
            githubLogin: "octocat",
        });

        await expect(deleteLoggedInUserAccount({ userId: "user_2" })).rejects.toThrow(
            "Only incomplete accounts can be deleted here"
        );
        expect(userDeleteMock).not.toHaveBeenCalled();
    });

    it("blocks deleting the configured admin account", async () => {
        userFindUniqueMock.mockResolvedValue({
            id: "admin_1",
            email: null,
            githubLogin: "403errors",
        });

        await expect(deleteLoggedInUserAccount({ userId: "admin_1" })).rejects.toThrow(
            "Cannot delete the configured admin account"
        );
        expect(userDeleteMock).not.toHaveBeenCalled();
    });
});
