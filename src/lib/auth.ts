import NextAuth from "next-auth";
import { linkGithubOAuthUser } from "./auth-oauth-db";
import { queueWelcomeEmailDelivery } from "./emails/delivery-service";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
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
                // NextAuth maps `false` to AccessDenied; redirect to a clearer error page instead.
                return "/auth/error?error=Configuration";
            }
        },
    },
});
