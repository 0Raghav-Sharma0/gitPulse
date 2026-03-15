import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportContent } from "@/app/report/[scan_id]/ReportContent";

const {
    authMock,
    getScanResultWithStatusMock,
    getPreviousScanMock,
    canAccessPrivateReportMock,
    buildReportViewDataMock,
    trackReportConversionEventMock,
    isAdminUserMock,
    notFoundMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    getScanResultWithStatusMock: vi.fn(),
    getPreviousScanMock: vi.fn(),
    canAccessPrivateReportMock: vi.fn(),
    buildReportViewDataMock: vi.fn(),
    trackReportConversionEventMock: vi.fn(),
    isAdminUserMock: vi.fn(),
    notFoundMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
}));

vi.mock("@/lib/services/scan-storage", () => ({
    getScanResultWithStatus: getScanResultWithStatusMock,
    getPreviousScan: getPreviousScanMock,
}));

vi.mock("@/lib/admin-auth", () => ({
    isAdminUser: isAdminUserMock,
}));

vi.mock("@/lib/services/report-access", () => ({
    canAccessPrivateReport: canAccessPrivateReportMock,
}));

vi.mock("@/lib/services/report-service", () => ({
    buildReportViewData: buildReportViewDataMock,
}));

vi.mock("@/lib/analytics", () => ({
    trackReportConversionEvent: trackReportConversionEventMock,
}));

vi.mock("next/navigation", () => ({
    notFound: notFoundMock,
}));

import ReportPage, { generateMetadata } from "@/app/report/[scan_id]/page";

const scan = {
    id: "scan_1",
    owner: "acme",
    repo: "widget",
    timestamp: Date.now(),
    expiresAt: Date.now() + 60_000,
    depth: "deep",
    summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0, info: 0 },
    findings: [],
    userId: "user_1",
};

describe("private report page access", () => {
    beforeEach(() => {
        authMock.mockReset();
        getScanResultWithStatusMock.mockReset();
        getPreviousScanMock.mockReset();
        canAccessPrivateReportMock.mockReset();
        buildReportViewDataMock.mockReset();
        trackReportConversionEventMock.mockReset();
        isAdminUserMock.mockReset();
        notFoundMock.mockReset();
        notFoundMock.mockImplementation(() => {
            throw new Error("notFound");
        });
        isAdminUserMock.mockReturnValue(false);
    });

    it("returns private metadata when user cannot access scan", async () => {
        getScanResultWithStatusMock.mockResolvedValue({ status: "ok", scan });
        authMock.mockResolvedValue(null);
        canAccessPrivateReportMock.mockReturnValue(false);

        const metadata = await generateMetadata({ params: Promise.resolve({ scan_id: "scan_1" }) });
        expect(metadata.title).toBe("Private Security Report - GitPulse");
    });

    it("calls notFound when unauthorized", async () => {
        getScanResultWithStatusMock.mockResolvedValue({ status: "ok", scan });
        authMock.mockResolvedValue(null);
        canAccessPrivateReportMock.mockReturnValue(false);

        await expect(ReportPage({ params: Promise.resolve({ scan_id: "scan_1" }) })).rejects.toThrow("notFound");
    });

    it("renders ReportContent for authorized users", async () => {
        getScanResultWithStatusMock.mockResolvedValue({ status: "ok", scan });
        getPreviousScanMock.mockResolvedValue(null);
        authMock.mockResolvedValue({ user: { id: "user_1" } });
        canAccessPrivateReportMock.mockReturnValue(true);
        isAdminUserMock.mockReturnValue(true);
        buildReportViewDataMock.mockReturnValue({
            priorScanDiff: { new: 1, resolved: 0, unchanged: 0 },
            topFixes: [],
            findingViews: [],
            globalFixPrompt: "Fix everything",
            globalChatHref: "/chat?q=acme%2Fwidget&prompt=Fix%20everything",
        });

        const view = await ReportPage({ params: Promise.resolve({ scan_id: "scan_1" }) }) as ReactElement<{
            isSharedView: boolean;
            canShareReport: boolean;
            canGenerateOutreach: boolean;
            shareMode: string;
            globalFixPrompt: string;
            globalChatHref: string;
        }>;
        expect(view.type).toBe(ReportContent);
        expect(view.props.isSharedView).toBe(false);
        expect(view.props.canShareReport).toBe(true);
        expect(view.props.canGenerateOutreach).toBe(true);
        expect(view.props.shareMode).toBe("canonical");
        expect(view.props.globalFixPrompt).toBe("Fix everything");
        expect(view.props.globalChatHref).toContain("/chat?q=acme%2Fwidget");
    });

    it("renders expired report state and tracks event", async () => {
        getScanResultWithStatusMock.mockResolvedValue({ status: "expired", scan });
        authMock.mockResolvedValue({ user: { id: "user_1" } });
        canAccessPrivateReportMock.mockReturnValue(true);

        const view = await ReportPage({ params: Promise.resolve({ scan_id: "scan_1" }) }) as ReactElement;
        expect(view.type).not.toBe(ReportContent);
        expect(trackReportConversionEventMock).toHaveBeenCalledWith("report_expired_viewed", "scan_1", {
            actorUsername: null,
        });
    });
});
