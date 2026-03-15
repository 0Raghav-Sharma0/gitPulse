import { NextRequest, NextResponse } from "next/server";
import { applyResendWebhookEvent } from "@/lib/emails/delivery-service";
import { getWebhookVerifierClient } from "@/lib/emails/mailer";

function getWebhookHeaders(request: NextRequest) {
    const id = request.headers.get("svix-id");
    const timestamp = request.headers.get("svix-timestamp");
    const signature = request.headers.get("svix-signature");

    if (!id || !timestamp || !signature) {
        return null;
    }

    return { id, timestamp, signature };
}

export async function POST(request: NextRequest) {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET is not configured" }, { status: 500 });
    }

    const headers = getWebhookHeaders(request);
    if (!headers) {
        return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 400 });
    }

    const payload = await request.text();

    try {
        const client = getWebhookVerifierClient();
        const event = client.webhooks.verify({
            payload,
            headers,
            webhookSecret,
        });

        await applyResendWebhookEvent(event);
        return NextResponse.json({ ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid webhook signature";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
