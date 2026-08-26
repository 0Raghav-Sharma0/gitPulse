import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import {
    getAuthSecret,
    getGitHubOAuthConfigError,
    getGitHubOAuthCredentials,
} from "./auth-env";
import { prisma } from "./db";
import { INVALID_SESSION_ERROR_CODE } from "./session-guard";
import { getGithubAccessTokenForUser, resolveLinkedUserId } from "./auth-oauth-db";

function buildGitHubProvider() {
    if (getGitHubOAuthConfigError()) {
        return null;
    }

    const { clientId, clientSecret } = getGitHubOAuthCredentials();
    return GitHub({
        clientId,
        clientSecret,
        issuer: "https://github.com/login/oauth",
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

            // Never treat GitHub's numeric provider id as our Prisma user id.
            if (!token.id && typeof token.sub === "string") {
                try {
                    const linkedUserId = await resolveLinkedUserId({
                        githubLogin:
                            typeof token.username === "string"
                                ? token.username
                                : undefined,
                        providerAccountId: token.sub,
                    });
                    if (linkedUserId) {
                        token.id = linkedUserId;
                    }
                } catch (error: unknown) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    console.error("[auth] jwt user id lookup failed:", message);
                }
            }
            if (profile && "login" in profile && profile.login) {
                token.username = String(profile.login);
            }
            if (account?.access_token) {
                token.accessToken = account.access_token;
            } else {
                try {
                    const refreshedToken = await getGithubAccessTokenForUser({
                        userId:
                            typeof token.id === "string" ? token.id : undefined,
                        githubLogin:
                            typeof token.username === "string"
                                ? token.username
                                : undefined,
                        providerAccountId:
                            typeof token.sub === "string" ? token.sub : undefined,
                    });
                    if (refreshedToken) {
                        token.accessToken = refreshedToken;
                    }
                } catch (error: unknown) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    console.error("[auth] jwt token refresh failed:", message);
                }
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
            const resolvedUserId =
                typeof token.id === "string" && !/^\d+$/.test(token.id)
                    ? token.id
                    : undefined;
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
