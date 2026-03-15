import { auth } from "@/lib/auth";
import WelcomeBanner from "@/components/Dashboard/WelcomeBanner";
import QuickStats from "@/components/Dashboard/QuickStats";
import RecentScans from "@/components/Dashboard/RecentScans";
import { redirect } from "next/navigation";
import { buildInvalidSessionSignOutRedirect, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

export default async function DashboardPage() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        redirect("/");
    }
    if (authState === "invalid") {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    const userId = getSessionUserId(session);
    const user = session?.user;
    if (!userId) {
        redirect(buildInvalidSessionSignOutRedirect());
    }
    if (!user) {
        redirect("/");
    }

    return (
        <div className="space-y-8">
            <WelcomeBanner user={user} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <RecentScans userId={userId} limit={5} showViewAll />
                </div>
                <div className="space-y-8">
                    <QuickStats />
                </div>
            </div>
        </div>
    );
}
