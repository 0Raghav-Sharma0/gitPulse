import NextAuth from "next-auth";
import { linkGithubOAuthUser } from "./auth-oauth-db";
import { queueWelcomeEmailDelivery } from "./emails/delivery-service";
import authConfig from "./auth.config";
import { getGitHubOAuthConfigError, getGitHubOAuthCredentials } from "./auth-env";
import GitHub from "next-auth/providers/github";
import { ensureDatabaseEnv } from "./resolve-db-env";

ensureDatabaseEnv();

function buildRuntimeGitHubProvider() {
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

const runtimeGitHubProvider = buildRuntimeGitHubProvider();
if (!runtimeGitHubProvider) {
    console.error("[auth] GitHub OAuth provider is not configured at runtime.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: runtimeGitHubProvider ? [runtimeGitHubProvider] : [],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ account, profile }) {
            if (account?.provider !== "github") {
                return true;
            }

            try {
                const dbUser = await linkGithubOAuthUser(account, profile);
                if (dbUser.email) {
                    const username =
                        dbUser.githubLogin ||
                        dbUser.name ||
                        dbUser.email.split("@")[0];
                    queueWelcomeEmailDelivery({
                        userId: dbUser.id,
                        toEmail: dbUser.email,
                        username: String(username),
                    }).catch((error: unknown) => {
                        console.error("Failed to queue welcome email:", error);
                    });
                }
                return true;
            } catch (error: unknown) {
                const message =
                    error instanceof Error ? error.message : String(error);
                console.error("[auth] GitHub sign-in database error:", message);
                const reason = encodeURIComponent(message.slice(0, 240));
                return `/auth/error?error=Configuration&reason=${reason}`;
            }
        },
    },
});
