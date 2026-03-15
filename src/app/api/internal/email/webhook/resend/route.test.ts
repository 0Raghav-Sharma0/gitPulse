import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    applyResendWebhookEventMock,
    verifyMock,
    getWebhookVerifierClientMock,
} = vi.hoisted(() => ({
    applyResendWebhookEventMock: vi.fn(),
    verifyMock: vi.fn(),
    getWebhookVerifierClientMock: vi.fn(),
}));

vi.mock("@/lib/emails/delivery-service", () => ({
    applyResendWebhookEvent: applyResendWebhookEventMock,
}));

vi.mock("@/lib/emails/mailer", () => ({
    getWebhookVerifierClient: getWebhookVerifierClientMock,
}));

import { POST } from "@/app/api/internal/email/webhook/resend/route";

describe("POST /api/internal/email/webhook/resend", () => {
    beforeEach(() => {
        process.env.RESEND_WEBHOOK_SECRET = "webhook_secret";
        applyResendWebhookEventMock.mockReset();
        verifyMock.mockReset();
        getWebhookVerifierClientMock.mockReset();
        getWebhookVerifierClientMock.mockReturnValue({
            webhooks: {
                verify: verifyMock,
            },
        });
    });

    it("rejects invalid signatures", async () => {
        verifyMock.mockImplementation(() => {
            throw new Error("invalid signature");
        });

        const request = new NextRequest("http://localhost/api/internal/email/webhook/resend", {
            method: "POST",
            body: JSON.stringify({ hello: "world" }),
            headers: {
                "content-type": "application/json",
                "svix-id": "evt_1",
                "svix-timestamp": "123456",
                "svix-signature": "sig",
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        expect(applyResendWebhookEventMock).not.toHaveBeenCalled();
    });

    it("accepts valid signatures and forwards event", async () => {
        verifyMock.mockReturnValue({
            type: "email.delivered",
            created_at: new Date().toISOString(),
            data: {
                email_id: "email_123",
                created_at: new Date().toISOString(),
                from: "from@example.com",
                to: ["to@example.com"],
                subject: "subject",
            },
        });

        const request = new NextRequest("http://localhost/api/internal/email/webhook/resend", {
            method: "POST",
            body: JSON.stringify({ hello: "world" }),
            headers: {
                "content-type": "application/json",
                "svix-id": "evt_1",
                "svix-timestamp": "123456",
                "svix-signature": "sig",
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(applyResendWebhookEventMock).toHaveBeenCalledOnce();
    });
});
