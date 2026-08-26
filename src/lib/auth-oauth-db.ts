import type { Account, Profile } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ensureDatabaseEnv } from "./resolve-db-env";

ensureDatabaseEnv();

type GithubProfile = Profile & {
    login?: string;
    email?: string | null;
};

function isUniqueConstraintError(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}

function buildAccountWriteData(account: Account) {
    return {
        access_token: account.access_token ?? undefined,
        refresh_token: account.refresh_token ?? undefined,
        expires_at: account.expires_at ?? undefined,
        token_type: account.token_type ?? undefined,
        scope: account.scope ?? undefined,
        id_token: account.id_token ?? undefined,
    };
}

async function upsertGithubAccount(userId: string, account: Account) {
    const providerAccountId = account.providerAccountId;
    const accountData = buildAccountWriteData(account);

    await prisma.account.upsert({
        where: {
            provider_providerAccountId: {
                provider: "github",
                providerAccountId,
            },
        },
        update: accountData,
        create: {
            userId,
            type: account.type,
            provider: "github",
            providerAccountId,
            ...accountData,
        },
    });
}

async function findExistingUser(input: {
    email?: string;
    githubLogin?: string;
}) {
    if (input.email) {
        const byEmail = await prisma.user.findUnique({
            where: { email: input.email },
        });
        if (byEmail) {
            return byEmail;
        }
    }

    if (input.githubLogin) {
        return prisma.user.findUnique({
            where: { githubLogin: input.githubLogin },
        });
    }

    return null;
}

async function syncGithubLogin(userId: string, githubLogin?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error("Linked GitHub user record could not be loaded.");
    }

    if (!githubLogin || user.githubLogin === githubLogin) {
        return user;
    }

    return prisma.user.update({
        where: { id: user.id },
        data: { githubLogin },
    });
}

export async function linkGithubOAuthUser(
    account: Account,
    profile: GithubProfile | undefined,
) {
    const providerAccountId = account.providerAccountId;
    const githubLogin =
        typeof profile?.login === "string" ? profile.login : undefined;
    const email =
        typeof profile?.email === "string"
            ? profile.email
            : typeof account.email === "string"
              ? account.email
              : undefined;

    const linkedAccount = await prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider: "github",
                providerAccountId,
            },
        },
        include: { user: true },
    });

    if (linkedAccount?.user) {
        await upsertGithubAccount(linkedAccount.user.id, account);
        return syncGithubLogin(linkedAccount.user.id, githubLogin);
    }

    let user = await findExistingUser({ email, githubLogin });

    if (!user) {
        if (!githubLogin && !email) {
            throw new Error(
                "GitHub profile is missing login and email; ensure the OAuth app has user:email scope.",
            );
        }

        try {
            user = await prisma.user.create({
                data: {
                    email,
                    emailVerified: email ? new Date() : undefined,
                    name:
                        typeof profile?.name === "string"
                            ? profile.name
                            : githubLogin,
                    image:
                        typeof profile?.image === "string"
                            ? profile.image
                            : undefined,
                    githubLogin,
                },
            });
        } catch (error: unknown) {
            if (!isUniqueConstraintError(error)) {
                throw error;
            }

            user = await findExistingUser({ email, githubLogin });
            if (!user) {
                throw error;
            }
        }
    }

    try {
        await upsertGithubAccount(user.id, account);
    } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) {
            throw error;
        }

        const existingAccount = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "github",
                    providerAccountId,
                },
            },
            include: { user: true },
        });

        if (!existingAccount?.user) {
            throw error;
        }

        await upsertGithubAccount(existingAccount.user.id, account);
        user = existingAccount.user;
    }

    return syncGithubLogin(user.id, githubLogin);
}

export async function getGithubAccessTokenForUser(input: {
    userId?: string;
    githubLogin?: string;
    providerAccountId?: string;
}): Promise<string | undefined> {
    if (input.userId) {
        const account = await prisma.account.findFirst({
            where: { userId: input.userId, provider: "github" },
            select: { access_token: true },
        });
        if (account?.access_token) {
            return account.access_token;
        }
    }

    if (input.githubLogin) {
        const user = await prisma.user.findUnique({
            where: { githubLogin: input.githubLogin },
            select: {
                accounts: {
                    where: { provider: "github" },
                    take: 1,
                    select: { access_token: true },
                },
            },
        });
        const token = user?.accounts[0]?.access_token;
        if (token) {
            return token;
        }
    }

    if (input.providerAccountId) {
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "github",
                    providerAccountId: input.providerAccountId,
                },
            },
            select: { access_token: true },
        });
        if (account?.access_token) {
            return account.access_token;
        }
    }

    return undefined;
}

export async function resolveLinkedUserId(input: {
    userId?: string;
    githubLogin?: string;
    providerAccountId?: string;
}): Promise<string | undefined> {
    if (input.userId && !/^\d+$/.test(input.userId)) {
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            select: { id: true },
        });
        if (user) {
            return user.id;
        }
    }

    if (input.githubLogin) {
        const user = await prisma.user.findUnique({
            where: { githubLogin: input.githubLogin },
            select: { id: true },
        });
        if (user) {
            return user.id;
        }
    }

    if (input.providerAccountId) {
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "github",
                    providerAccountId: input.providerAccountId,
                },
            },
            select: { userId: true },
        });
        if (account?.userId) {
            return account.userId;
        }
    }

    return undefined;
}
