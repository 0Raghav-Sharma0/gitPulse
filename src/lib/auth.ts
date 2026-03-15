import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { queueWelcomeEmailDelivery } from "./emails/delivery-service";
import authConfig from "./auth.config";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, profile }) {
            if (user?.id && user?.email) {
                const username = profile?.login || user.name || user.email.split("@")[0];
                queueWelcomeEmailDelivery({
                    userId: user.id,
                    toEmail: user.email,
                    username: String(username),
                }).catch((error: unknown) => {
                    console.error("Failed to queue welcome email:", error);
                });
            }

            if (user?.id && profile?.login) {
                await prisma.user
                    .update({
                        where: { id: user.id },
                        data: { githubLogin: profile.login },
                    })
                    .catch((error: unknown) => {
                        console.error("Failed to persist githubLogin:", error);
                    });
            }
            return true;
        },
    },
});
