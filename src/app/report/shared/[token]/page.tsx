import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPreviousScan, getScanResultWithStatus } from "@/lib/services/scan-storage";
import { resolveScanFromShareToken } from "@/lib/services/scan-share-links";
import { buildReportViewData } from "@/lib/services/report-service";
import { trackReportConversionEvent } from "@/lib/analytics";
import { ReportContent } from "@/app/report/[scan_id]/ReportContent";
import { ReportExpiredState } from "@/app/report/components/ReportExpiredState";

export const dynamic = "force-dynamic";

type SharedLinkFailureReason = "invalid" | "expired" | "revoked";

function SharedLinkFailureState({ reason }: { reason: SharedLinkFailureReason }) {
    const messages: Record<SharedLinkFailureReason, { title: string; body: string }> = {
        invalid: {
            title: "Invalid Share Link",
            body: "This report link is not valid. Ask the report owner to generate a fresh signed link.",
        },
        expired: {
            title: "Report Expired",
            body: "This report is no longer available. Run a new scan to generate a fresh report.",
        },
        revoked: {
            title: "Share Link Revoked",
            body: "The report owner revoked this link. Request a new signed link if access is still needed.",
        },
    };

    const content = messages[reason];

    return (
        <div className="min-h-screen bg-[#FDFCFB] text-gray-900 flex items-center justify-center p-6">
            <div className="max-w-lg w-full rounded-2xl border-2 border-gray-200 bg-[#FEF9F2] p-8 space-y-4">
                <h1 className="text-2xl font-semibold text-gray-900">{content.title}</h1>
                <p className="text-gray-700">{content.body}</p>
                <p className="text-sm text-gray-500">
                    GitPulse uses signed, expiring report URLs to protect sensitive scan details.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm text-gray-900 font-medium"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "GitPulse Security Report",
        description: "Private security report shared through an expiring signed URL.",
        robots: {
            index: false,
            follow: false,
        },
    };
}

export default async function SharedReportByTokenPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const resolvedParams = await params;
    const resolution = await resolveScanFromShareToken(resolvedParams.token);
    const session = await auth();
    const actorUsername = session?.user?.username ?? null;

    if (resolution.status !== "ok") {
        if (resolution.status === "expired") {
            await trackReportConversionEvent("report_expired_viewed", undefined, {
                actorUsername,
            });
        } else {
            await trackReportConversionEvent("report_shared_link_invalid", undefined, {
                actorUsername,
            });
        }
        return <SharedLinkFailureState reason={resolution.status} />;
    }

    const scanResult = await getScanResultWithStatus(resolution.scanId);
    if (scanResult.status === "not_found") {
        await trackReportConversionEvent("report_shared_link_invalid", undefined, {
            actorUsername,
        });
        return <SharedLinkFailureState reason="invalid" />;
    }
    const scan = scanResult.scan;

    if (scanResult.status === "expired") {
        await trackReportConversionEvent("report_expired_viewed", scan.id, {
            actorUsername,
        });
        return (
            <ReportExpiredState
                owner={scan.owner}
                repo={scan.repo}
                expiresAt={scan.expiresAt}
            />
        );
    }

    await trackReportConversionEvent("report_viewed_shared", scan.id, {
        actorUsername,
    });

    const previousScan = await getPreviousScan(scan.owner, scan.repo, scan.id, scan.timestamp);
    const reportView = buildReportViewData(scan, previousScan);

    return (
        <ReportContent
            scan={scan}
            priorScanDiff={reportView.priorScanDiff}
            topFixes={reportView.topFixes}
            findingViews={reportView.findingViews}
            globalFixPrompt={reportView.globalFixPrompt}
            globalChatHref={reportView.globalChatHref}
            hasPreviousScan={Boolean(previousScan)}
            isSharedView={true}
            canShareReport={true}
            canGenerateOutreach={false}
            shareMode="copy-current-url"
            reportExpiresAt={scan.expiresAt}
        />
    );
}
