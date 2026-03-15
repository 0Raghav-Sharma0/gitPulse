import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

type ConversationParams =
    | { scope: "repo"; conversationKey: string; owner: string; repo: string; username: null }
    | { scope: "profile"; conversationKey: string; owner: null; repo: null; username: string };

function resolveConversation(
    owner: string | null,
    repo: string | null,
    username: string | null
): ConversationParams | null {
    if (owner && repo) {
        return {
            scope: "repo",
            conversationKey: `repo:${owner}:${repo}`,
            owner,
            repo,
            username: null,
        };
    }

    if (username) {
        return {
            scope: "profile",
            conversationKey: `profile:${username}`,
            owner: null,
            repo: null,
            username,
        };
    }

    return null;
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        const authState = getSessionAuthState(session);
        if (authState === "unauthenticated") {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authState === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        if (!userId) {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');
        const username = searchParams.get('username');

        const conversation = resolveConversation(owner, repo, username);
        if (!conversation) {
            return NextResponse.json({ error: 'Missing repository or profile parameters' }, { status: 400 });
        }

        const record = await prisma.chatConversation.findUnique({
            where: {
                userId_conversationKey: {
                    userId,
                    conversationKey: conversation.conversationKey,
                },
            },
            select: { messages: true },
        });

        const messages = Array.isArray(record?.messages) ? record.messages : [];
        return NextResponse.json({ messages });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const authState = getSessionAuthState(session);
        if (authState === "unauthenticated") {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authState === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        if (!userId) {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const body = await req.json();
        const { owner, repo, username, messages } = body;

        const conversation = resolveConversation(owner ?? null, repo ?? null, username ?? null);
        if (!conversation) {
            return NextResponse.json({ error: 'Missing repository or profile parameters' }, { status: 400 });
        }

        await prisma.chatConversation.upsert({
            where: {
                userId_conversationKey: {
                    userId,
                    conversationKey: conversation.conversationKey,
                },
            },
            update: {
                scope: conversation.scope,
                owner: conversation.owner,
                repo: conversation.repo,
                username: conversation.username,
                messages: Array.isArray(messages) ? messages : [],
            },
            create: {
                userId,
                conversationKey: conversation.conversationKey,
                scope: conversation.scope,
                owner: conversation.owner,
                repo: conversation.repo,
                username: conversation.username,
                messages: Array.isArray(messages) ? messages : [],
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving chat history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        const authState = getSessionAuthState(session);
        if (authState === "unauthenticated") {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authState === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        if (!userId) {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');
        const username = searchParams.get('username');

        const conversation = resolveConversation(owner, repo, username);
        if (!conversation) {
            return NextResponse.json({ error: 'Missing repository or profile parameters' }, { status: 400 });
        }

        await prisma.chatConversation.deleteMany({
            where: {
                userId,
                conversationKey: conversation.conversationKey,
            },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
