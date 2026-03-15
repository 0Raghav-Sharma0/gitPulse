import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionalEmailStatus, TransactionalEmailTemplate } from "@/lib/emails/constants";

const {
    prismaMock,
    sendWelcomeEmailMock,
} = vi.hoisted(() => ({
    prismaMock: {
        transactionalEmailDelivery: {
            upsert: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(),
        },
    },
    sendWelcomeEmailMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    prisma: prismaMock,
}));

vi.mock("@/lib/emails/mailer", () => ({
    sendWelcomeEmail: sendWelcomeEmailMock,
}));

import {
    applyResendWebhookEvent,
    attemptWelcomeEmailDelivery,
    processTransactionalEmailRetries,
    queueWelcomeEmailDelivery,
} from "@/lib/emails/delivery-service";

describe("delivery-service", () => {
    beforeEach(() => {
        process.env.RESEND_API_KEY = "test_key";
        process.env.RESEND_FROM_EMAIL = "GitPulse <onboarding@example.com>";
        prismaMock.transactionalEmailDelivery.upsert.mockReset();
        prismaMock.transactionalEmailDelivery.findUnique.mockReset();
        prismaMock.transactionalEmailDelivery.update.mockReset();
        prismaMock.transactionalEmailDelivery.findMany.mockReset();
        prismaMock.transactionalEmailDelivery.updateMany.mockReset();
        sendWelcomeEmailMock.mockReset();
    });

    it("does not resend when delivery is already SENT", async () => {
        prismaMock.transactionalEmailDelivery.upsert.mockResolvedValue({
            id: "delivery_1",
            status: TransactionalEmailStatus.SENT,
        });

        await queueWelcomeEmailDelivery({
            userId: "user_1",
            toEmail: "user@example.com",
            username: "user",
        });

        expect(sendWelcomeEmailMock).not.toHaveBeenCalled();
    });

    it("marks delivery as SENT after a successful send", async () => {
        prismaMock.transactionalEmailDelivery.findUnique.mockResolvedValue({
            id: "delivery_1",
            userId: "user_1",
            template: TransactionalEmailTemplate.WELCOME,
            status: TransactionalEmailStatus.PENDING,
            attempts: 0,
            toEmail: "user@example.com",
            templateData: { username: "user" },
            providerMessageId: null,
        });
        sendWelcomeEmailMock.mockResolvedValue({ success: true, messageId: "msg_123" });
        prismaMock.transactionalEmailDelivery.update.mockResolvedValue({});

        await attemptWelcomeEmailDelivery("delivery_1");

        const updateCalls = prismaMock.transactionalEmailDelivery.update.mock.calls;
        expect(updateCalls.length).toBe(2);
        expect(updateCalls[1]?.[0]?.data?.status).toBe(TransactionalEmailStatus.SENT);
    });

    it("marks delivery as FAILED when send fails", async () => {
        prismaMock.transactionalEmailDelivery.findUnique.mockResolvedValue({
            id: "delivery_1",
            userId: "user_1",
            template: TransactionalEmailTemplate.WELCOME,
            status: TransactionalEmailStatus.PENDING,
            attempts: 0,
            toEmail: "user@example.com",
            templateData: { username: "user" },
            providerMessageId: null,
        });
        sendWelcomeEmailMock.mockResolvedValue({ success: false, error: "Provider unavailable" });
        prismaMock.transactionalEmailDelivery.update.mockResolvedValue({});

        await attemptWelcomeEmailDelivery("delivery_1");

        const updateCalls = prismaMock.transactionalEmailDelivery.update.mock.calls;
        expect(updateCalls.length).toBe(2);
        expect(updateCalls[1]?.[0]?.data?.status).toBe(TransactionalEmailStatus.FAILED);
    });

    it("retries only eligible pending or failed deliveries", async () => {
        prismaMock.transactionalEmailDelivery.findMany.mockResolvedValue([
            { id: "d1" },
            { id: "d2" },
        ]);
        prismaMock.transactionalEmailDelivery.findUnique
            .mockResolvedValueOnce({
                id: "d1",
                userId: "user_1",
                template: TransactionalEmailTemplate.WELCOME,
                status: TransactionalEmailStatus.PENDING,
                attempts: 0,
                toEmail: "user1@example.com",
                templateData: { username: "user1" },
                providerMessageId: null,
            })
            .mockResolvedValueOnce({
                id: "d2",
                userId: "user_2",
                template: TransactionalEmailTemplate.WELCOME,
                status: TransactionalEmailStatus.FAILED,
                attempts: 1,
                toEmail: "user2@example.com",
                templateData: { username: "user2" },
                providerMessageId: null,
            });
        sendWelcomeEmailMock.mockResolvedValue({ success: true, messageId: "msg" });
        prismaMock.transactionalEmailDelivery.update.mockResolvedValue({});

        const result = await processTransactionalEmailRetries(10);

        expect(result).toEqual({ selected: 2, processed: 2 });
        expect(sendWelcomeEmailMock).toHaveBeenCalledTimes(2);
    });

    it("marks delivery as SENT on delivered webhook events", async () => {
        prismaMock.transactionalEmailDelivery.updateMany.mockResolvedValue({ count: 1 });

        await applyResendWebhookEvent({
            type: "email.delivered",
            created_at: new Date().toISOString(),
            data: {
                email_id: "email_123",
                created_at: new Date().toISOString(),
                from: "from@example.com",
                to: ["to@example.com"],
                subject: "Welcome",
            },
        } as never);

        const call = prismaMock.transactionalEmailDelivery.updateMany.mock.calls[0]?.[0];
        expect(call?.where).toEqual({ providerMessageId: "email_123" });
        expect(call?.data?.status).toBe(TransactionalEmailStatus.SENT);
    });

    it("marks delivery as FAILED on bounced webhook events", async () => {
        prismaMock.transactionalEmailDelivery.updateMany.mockResolvedValue({ count: 1 });

        await applyResendWebhookEvent({
            type: "email.bounced",
            created_at: new Date().toISOString(),
            data: {
                email_id: "email_123",
                created_at: new Date().toISOString(),
                from: "from@example.com",
                to: ["to@example.com"],
                subject: "Welcome",
                bounce: {
                    message: "Mailbox unavailable",
                    subType: "general",
                    type: "hard",
                },
            },
        } as never);

        const call = prismaMock.transactionalEmailDelivery.updateMany.mock.calls[0]?.[0];
        expect(call?.where).toEqual({ providerMessageId: "email_123" });
        expect(call?.data?.status).toBe(TransactionalEmailStatus.FAILED);
    });
});
