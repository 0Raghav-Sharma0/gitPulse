import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import {
    getAuthSecret,
    getGitHubOAuthConfigError,
    getGitHubOAuthCredentials,
} from "./auth-env";
import { prisma } from "./db";
import { INVALID_SESSION_ERROR_CODE } from "./session-guard";

function buildGitHubProvider() {
    if (getGitHubOAuthConfigError()) {
        return null;
    }

    const { clientId, clientSecret } = getGitHubOAuthCredentials();
    return GitHub({
        clientId,
        clientSecret,
        authorization: {
            params: {
                scope: "read:user user:email repo",
            },
        },
    });
}

const githubProvider = buildGitHubProvider();

const authConfig: NextAuthConfig = {
    secret: getAuthSecret(),
    trustHost: true,
    useSecureCookies: process.env.NODE_ENV === "production",
    providers: githubProvider ? [githubProvider] : [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false;
            }
            return true;
        },
        async jwt({ token, profile, account }) {
            if (account?.provider === "github" && account.providerAccountId) {
                try {
                    const linked = await prisma.account.findUnique({
                        where: {
                            provider_providerAccountId: {
                                provider: "github",
                                providerAccountId: account.providerAccountId,
                            },
                        },
                        include: { user: true },
                    });
                    if (linked?.user) {
                        token.id = linked.user.id;
                        if (linked.user.githubLogin) {
                            token.username = linked.user.githubLogin;
                        }
                    }
                } catch (error: unknown) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    console.error("[auth] jwt account lookup failed:", message);
                }
            }

            // Do not use OAuth `user.id` — for GitHub it is a numeric provider id, not our Prisma cuid.
            if (!token.id && typeof token.sub === "string") {
                token.id = token.sub;
            }
            if (profile && "login" in profile && profile.login) {
                token.username = String(profile.login);
            }
            if (account?.access_token) {
                token.accessToken = account.access_token;
            }
            if (account?.scope) {
                token.oauthScope = account.scope;
            }
            if (!token.id) {
                token.error = INVALID_SESSION_ERROR_CODE;
            } else {
                delete token.error;
            }
            return token;
        },
        async session({ session, token }) {
            const resolvedUserId = typeof token.id === "string" ? token.id : (typeof token.sub === "string" ? token.sub : undefined);
            if (resolvedUserId && session.user) {
                session.user.id = resolvedUserId;
            }
            if (typeof token.username === "string" && session.user) {
                session.user.username = token.username;
            }
            if (typeof token.accessToken === "string") {
                session.accessToken = token.accessToken;
            }
            if (typeof token.oauthScope === "string") {
                session.oauthScope = token.oauthScope;
            }
            if (!resolvedUserId) {
                session.error = INVALID_SESSION_ERROR_CODE;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
};

export default authConfig;
