import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminUser } from "@/lib/admin-auth";
import { trackReportConversionEvent } from "@/lib/analytics";
import { getPreviousScan, getScanResultWithStatus } from '@/lib/services/scan-storage';
import { canAccessPrivateReport } from '@/lib/services/report-access';
import { buildReportViewData } from '@/lib/services/report-service';
import { ReportExpiredState } from '@/app/report/components/ReportExpiredState';
import { ReportContent } from './ReportContent';

export async function generateMetadata({ params }: { params: Promise<{ scan_id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const scanResult = await getScanResultWithStatus(resolvedParams.scan_id);

    if (scanResult.status === "not_found") {
        return {
            title: 'Report Not Found - GitPulse'
        };
    }
    const scan = scanResult.scan;

    const session = await auth();
    if (!canAccessPrivateReport(session, scan)) {
        return {
            title: "Private Security Report - GitPulse",
            description: "Sign in to view this security report.",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    if (scanResult.status === "expired") {
        return {
            title: "Report Expired - GitPulse",
            description: "This scan report has expired. Run a new scan to regenerate it.",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const { owner, repo, summary } = scan;
    const desc = `${summary.critical} Critical, ${summary.high} High, ${summary.medium} Medium issues found. Review the full GitPulse security report and remediate all findings in one Repo Chat flow.`;

    return {
        title: `Security Scan: ${owner}/${repo} - GitPulse`,
        description: desc,
        openGraph: {
            title: `GitPulse Security Scan: ${owner}/${repo}`,
            description: desc,
            type: 'website',
            images: [
                {
                    url: '/og-image.svg',
                    width: 1200,
                    height: 630,
                    alt: 'Security Scan Summary',
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: `GitPulse Security Scan: ${owner}/${repo}`,
            description: desc,
            images: ['/og-image.svg'],
        }
    };
}

export default async function PrivateReportPage({ params }: { params: Promise<{ scan_id: string }> }) {
    const resolvedParams = await params;
    const scanResult = await getScanResultWithStatus(resolvedParams.scan_id);

    if (scanResult.status === "not_found") {
        notFound();
    }
    const scan = scanResult.scan;

    const session = await auth();
    if (!canAccessPrivateReport(session, scan)) {
        notFound();
    }

    if (scanResult.status === "expired") {
        await trackReportConversionEvent("report_expired_viewed", scan.id, {
            actorUsername: session?.user?.username ?? null,
        });
        return (
            <ReportExpiredState
                owner={scan.owner}
                repo={scan.repo}
                expiresAt={scan.expiresAt}
            />
        );
    }

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
            isSharedView={false}
            canShareReport={true}
            canGenerateOutreach={isAdminUser(session)}
            shareMode="canonical"
            reportExpiresAt={scan.expiresAt}
        />
    );
}
