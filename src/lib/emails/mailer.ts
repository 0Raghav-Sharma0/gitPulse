import { Resend } from "resend";
import WelcomeEmail from "./welcome";

let resendClient: Resend | null = null;

export interface SendWelcomeEmailInput {
    to: string;
    username: string;
    idempotencyKey: string;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

function getResendClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }

    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }

    return resendClient;
}

function getFromEmail(): string | null {
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    return from ? from : null;
}

export async function sendWelcomeEmail({
    to,
    username,
    idempotencyKey,
}: SendWelcomeEmailInput): Promise<SendEmailResult> {
    const client = getResendClient();
    if (!client) {
        return {
            success: false,
            error: "RESEND_API_KEY is not configured",
        };
    }

    const from = getFromEmail();
    if (!from) {
        return {
            success: false,
            error: "RESEND_FROM_EMAIL is not configured",
        };
    }

    try {
        const { data, error } = await client.emails.send(
            {
                from,
                to: [to],
                subject: "Welcome to GitPulse!",
                react: WelcomeEmail({ username }),
                tags: [
                    { name: "template", value: "welcome" },
                ],
            },
            { idempotencyKey }
        );

        if (error) {
            return {
                success: false,
                error: `${error.name}: ${error.message}`,
            };
        }

        return {
            success: true,
            messageId: data?.id,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: message,
        };
    }
}

export function getWebhookVerifierClient(): Resend {
    return new Resend(process.env.RESEND_API_KEY);
}
