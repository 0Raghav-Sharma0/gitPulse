import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import {
    getAuthSecret,
    getGitHubOAuthConfigError,
    getGitHubOAuthCredentials,
} from "./auth-env";
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
        async jwt({ token, profile, account, user }) {
            const candidateUserId = user?.id ?? token.id ?? token.sub;
            token.id = typeof candidateUserId === "string" ? candidateUserId : undefined;
            if (profile?.login) {
                token.username = profile.login;
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
