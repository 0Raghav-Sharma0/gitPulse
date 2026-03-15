import type { Session } from "next-auth";
import { isAdminUser } from "@/lib/admin-auth";
import { getSessionUserId } from "@/lib/session-guard";
import type { StoredScan } from "@/lib/services/scan-storage";

export function canAccessPrivateReport(session: Session | null | undefined, scan: StoredScan): boolean {
    if (isAdminUser(session)) {
        return true;
    }

    const userId = getSessionUserId(session);
    if (!userId) {
        return false;
    }

    return typeof scan.userId === "string" && scan.userId === userId;
}

