import type { Account, Profile } from "next-auth";
import { prisma } from "./db";

type GithubProfile = Profile & {
    login?: string;
    email?: string | null;
};

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

    const existingAccount = await prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider: "github",
                providerAccountId,
            },
        },
        include: { user: true },
    });

    if (existingAccount?.user) {
        await prisma.account.update({
            where: {
                provider_providerAccountId: {
                    provider: "github",
                    providerAccountId,
                },
            },
            data: {
                access_token: account.access_token ?? undefined,
                refresh_token: account.refresh_token ?? undefined,
                expires_at: account.expires_at ?? undefined,
                token_type: account.token_type ?? undefined,
                scope: account.scope ?? undefined,
                id_token: account.id_token ?? undefined,
            },
        });

        if (githubLogin && existingAccount.user.githubLogin !== githubLogin) {
            return prisma.user.update({
                where: { id: existingAccount.user.id },
                data: { githubLogin },
            });
        }

        return existingAccount.user;
    }

    const existingUser =
        (email
            ? await prisma.user.findUnique({ where: { email } })
            : null) ??
        (githubLogin
            ? await prisma.user.findUnique({ where: { githubLogin } })
            : null);

    if (existingUser) {
        await prisma.account.create({
            data: {
                userId: existingUser.id,
                type: account.type,
                provider: "github",
                providerAccountId,
                access_token: account.access_token ?? undefined,
                refresh_token: account.refresh_token ?? undefined,
                expires_at: account.expires_at ?? undefined,
                token_type: account.token_type ?? undefined,
                scope: account.scope ?? undefined,
                id_token: account.id_token ?? undefined,
            },
        });

        if (githubLogin && existingUser.githubLogin !== githubLogin) {
            return prisma.user.update({
                where: { id: existingUser.id },
                data: { githubLogin },
            });
        }

        return existingUser;
    }

    if (!githubLogin && !email) {
        throw new Error(
            "GitHub profile is missing login and email; ensure the OAuth app has user:email scope.",
        );
    }

    try {
        return await prisma.user.create({
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
                accounts: {
                    create: {
                        type: account.type,
                        provider: "github",
                        providerAccountId,
                        access_token: account.access_token ?? undefined,
                        refresh_token: account.refresh_token ?? undefined,
                        expires_at: account.expires_at ?? undefined,
                        token_type: account.token_type ?? undefined,
                        scope: account.scope ?? undefined,
                        id_token: account.id_token ?? undefined,
                    },
                },
            },
        });
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            error.message.includes("Unique constraint")
        ) {
            const byLogin = githubLogin
                ? await prisma.user.findUnique({ where: { githubLogin } })
                : null;
            if (byLogin) {
                return byLogin;
            }
        }
        throw error;
    }
}
