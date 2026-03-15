import { Prisma } from "@prisma/client";
import type { WebhookEventPayload } from "resend";
import { prisma } from "@/lib/db";
import { TransactionalEmailStatus, TransactionalEmailTemplate } from "./constants";
import { sendWelcomeEmail } from "./mailer";

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BASE_MINUTES = 5;
const RETRY_MAX_MINUTES = 12 * 60;
const EMAIL_EVENT_PREFIX = "email.";

interface WelcomeTemplateData {
    username: string;
}

function isWelcomeEmailPipelineEnabled(): boolean {
    return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

function getUsernameFromTemplateData(
    templateData: Prisma.JsonValue | null,
    toEmail: string
): string {
    if (templateData && typeof templateData === "object" && !Array.isArray(templateData)) {
        const username = (templateData as Record<string, unknown>).username;
        if (typeof username === "string" && username.trim().length > 0) {
            return username;
        }
    }
    return toEmail.split("@")[0] || "there";
}

function getNextRetryAt(attempts: number): Date {
    const exponent = Math.max(attempts - 1, 0);
    const minutes = Math.min(RETRY_BASE_MINUTES * 2 ** exponent, RETRY_MAX_MINUTES);
    return new Date(Date.now() + minutes * 60 * 1000);
}

export async function queueWelcomeEmailDelivery(input: {
    userId: string;
    toEmail: string;
    username: string;
}): Promise<void> {
    if (!isWelcomeEmailPipelineEnabled()) {
        return;
    }

    const userId = input.userId.trim();
    const toEmail = input.toEmail.trim();
    const username = input.username.trim();

    if (!userId || !toEmail) {
        return;
    }

    const templateData: WelcomeTemplateData = {
        username: username || toEmail.split("@")[0] || "there",
    };

    const delivery = await prisma.transactionalEmailDelivery.upsert({
        where: {
            userId_template: {
                userId,
                template: TransactionalEmailTemplate.WELCOME,
            },
        },
        create: {
            userId,
            template: TransactionalEmailTemplate.WELCOME,
            status: TransactionalEmailStatus.PENDING,
            toEmail,
            templateData: templateData as unknown as Prisma.InputJsonValue,
            nextRetryAt: new Date(),
        },
        update: {
            toEmail,
            templateData: templateData as unknown as Prisma.InputJsonValue,
        },
    });

    if (delivery.status === TransactionalEmailStatus.SENT) {
        return;
    }

    void attemptWelcomeEmailDelivery(delivery.id).catch((error) => {
        console.error("Welcome email attempt failed:", error);
    });
}

export async function attemptWelcomeEmailDelivery(deliveryId: string): Promise<void> {
    const delivery = await prisma.transactionalEmailDelivery.findUnique({
        where: { id: deliveryId },
    });

    if (!delivery || delivery.template !== TransactionalEmailTemplate.WELCOME) {
        return;
    }

    if (delivery.status === TransactionalEmailStatus.SENT || delivery.attempts >= MAX_RETRY_ATTEMPTS) {
        return;
    }

    const now = new Date();
    const currentAttempt = delivery.attempts + 1;

    await prisma.transactionalEmailDelivery.update({
        where: { id: delivery.id },
        data: {
            status: TransactionalEmailStatus.PENDING,
            attempts: { increment: 1 },
            lastAttemptAt: now,
            nextRetryAt: null,
            lastError: null,
        },
    });

    const username = getUsernameFromTemplateData(delivery.templateData, delivery.toEmail);
    const result = await sendWelcomeEmail({
        to: delivery.toEmail,
        username,
        idempotencyKey: `welcome:${delivery.userId}`,
    });

    if (result.success) {
        await prisma.transactionalEmailDelivery.update({
            where: { id: delivery.id },
            data: {
                status: TransactionalEmailStatus.SENT,
                sentAt: new Date(),
                nextRetryAt: null,
                lastError: null,
                providerMessageId: result.messageId ?? delivery.providerMessageId,
            },
        });
        return;
    }

    await prisma.transactionalEmailDelivery.update({
        where: { id: delivery.id },
        data: {
            status: TransactionalEmailStatus.FAILED,
            lastError: result.error?.slice(0, 1000) ?? "Unknown email delivery error",
            nextRetryAt: currentAttempt >= MAX_RETRY_ATTEMPTS ? null : getNextRetryAt(currentAttempt),
        },
    });
}

export async function processTransactionalEmailRetries(limit: number = 25): Promise<{
    selected: number;
    processed: number;
}> {
    if (!isWelcomeEmailPipelineEnabled()) {
        return { selected: 0, processed: 0 };
    }

    const batchLimit = Math.max(1, Math.min(limit, 100));
    const now = new Date();

    const candidates = await prisma.transactionalEmailDelivery.findMany({
        where: {
            template: TransactionalEmailTemplate.WELCOME,
            status: {
                in: [TransactionalEmailStatus.PENDING, TransactionalEmailStatus.FAILED],
            },
            attempts: {
                lt: MAX_RETRY_ATTEMPTS,
            },
            OR: [
                { nextRetryAt: null },
                { nextRetryAt: { lte: now } },
            ],
        },
        orderBy: [
            { updatedAt: "asc" },
        ],
        take: batchLimit,
    });

    for (const candidate of candidates) {
        await attemptWelcomeEmailDelivery(candidate.id);
    }

    return {
        selected: candidates.length,
        processed: candidates.length,
    };
}

function extractWebhookFailureReason(event: WebhookEventPayload): string {
    if (event.type === "email.bounced") {
        return event.data.bounce.message;
    }
    if (event.type === "email.failed") {
        return event.data.failed.reason;
    }
    if (event.type === "email.suppressed") {
        return event.data.suppressed.message;
    }
    if (event.type === "email.complained") {
        return "Recipient complaint";
    }
    return "Delivery failed";
}

export async function applyResendWebhookEvent(event: WebhookEventPayload): Promise<void> {
    if (!event.type.startsWith(EMAIL_EVENT_PREFIX)) {
        return;
    }

    const emailEvent = event as Extract<WebhookEventPayload, { type: `email.${string}` }>;
    const emailId = emailEvent.data.email_id;
    if (!emailId) {
        return;
    }

    const providerPayload = emailEvent as unknown as Prisma.InputJsonValue;

    if (emailEvent.type === "email.delivered") {
        await prisma.transactionalEmailDelivery.updateMany({
            where: { providerMessageId: emailId },
            data: {
                status: TransactionalEmailStatus.SENT,
                providerEventType: emailEvent.type,
                providerPayload,
                sentAt: new Date(),
                lastError: null,
            },
        });
        return;
    }

    if (
        emailEvent.type === "email.bounced" ||
        emailEvent.type === "email.failed" ||
        emailEvent.type === "email.suppressed" ||
        emailEvent.type === "email.complained"
    ) {
        await prisma.transactionalEmailDelivery.updateMany({
            where: { providerMessageId: emailId },
            data: {
                status: TransactionalEmailStatus.FAILED,
                providerEventType: emailEvent.type,
                providerPayload,
                lastError: extractWebhookFailureReason(emailEvent).slice(0, 1000),
                nextRetryAt: null,
            },
        });
        return;
    }

    await prisma.transactionalEmailDelivery.updateMany({
        where: { providerMessageId: emailId },
        data: {
            providerEventType: emailEvent.type,
            providerPayload,
        },
    });
}
