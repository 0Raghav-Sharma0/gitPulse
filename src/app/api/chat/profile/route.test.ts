import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, processProfileQueryStreamMock, trackAuthenticatedQueryEventMock, trackEventMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    processProfileQueryStreamMock: vi.fn(),
    trackAuthenticatedQueryEventMock: vi.fn(),
    trackEventMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/app/actions", () => ({
    processProfileQueryStream: processProfileQueryStreamMock,
}));

vi.mock("@/lib/analytics", () => ({
    trackAuthenticatedQueryEvent: trackAuthenticatedQueryEventMock,
    trackEvent: trackEventMock,
}));

import { POST } from "@/app/api/chat/profile/route";

describe("POST /api/chat/profile", () => {
    beforeEach(() => {
        authMock.mockReset();
        processProfileQueryStreamMock.mockReset();
        trackAuthenticatedQueryEventMock.mockReset();
        trackEventMock.mockReset();
    });

    it("returns 401 for unauthenticated users", async () => {
        authMock.mockResolvedValue(null);

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: {},
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({ error: "Unauthorized" });
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("returns INVALID_SESSION when user exists without id", async () => {
        authMock.mockResolvedValue({
            user: { name: "User", email: "user@example.com" },
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: {},
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({
            error: "Unauthorized",
            code: "INVALID_SESSION",
        });
        expect(processProfileQueryStreamMock).not.toHaveBeenCalled();
        expect(trackAuthenticatedQueryEventMock).not.toHaveBeenCalled();
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("tracks analytics for authenticated users", async () => {
        authMock.mockResolvedValue({
            user: { id: "user_123", email: "user@example.com" },
        });
        processProfileQueryStreamMock.mockImplementation(async function* () {
            yield { type: "content", text: "hello" };
        });

        const request = new NextRequest("http://localhost/api/chat/profile", {
            method: "POST",
            body: JSON.stringify({
                query: "Summarize profile",
                profileContext: {},
                modelPreference: "flash",
            }),
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0 (iPhone; Mobile)",
                "x-vercel-ip-country": "IN",
            },
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(trackAuthenticatedQueryEventMock).toHaveBeenCalledWith("user_123");
        expect(trackEventMock).toHaveBeenCalledWith("user_123", "query", {
            country: "IN",
            device: "mobile",
            userAgent: "Mozilla/5.0 (iPhone; Mobile)",
        });
    });
});
