import { NextRequest, NextResponse } from "next/server";
import { getLatestScanId, getScanResult } from "@/lib/services/scan-storage";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    const { owner, repo } = await params;

    try {
        const latestScanId = await getLatestScanId(owner, repo);
        let statusText = "no scan";
        let statusColor = "#9f9f9f"; // grey

        if (latestScanId) {
            const scan = await getScanResult(latestScanId);
            if (scan) {
                const { summary } = scan;
                if (summary.critical > 0) {
                    statusText = `${summary.critical} critical`;
                    statusColor = "#e05d44"; // red
                } else if (summary.high > 0) {
                    statusText = `${summary.high} high`;
                    statusColor = "#dfb317"; // yellow/orange
                } else if (summary.medium > 0) {
                    statusText = `${summary.medium} medium`;
                    statusColor = "#dfb317"; // yellow
                } else {
                    statusText = "secure";
                    statusColor = "#4c1"; // brightgreen
                }
            }
        }

        const label = "GitPulse";
        const svg = generateBadgeSvg(label, statusText, statusColor);

        return new NextResponse(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
            },
        });
    } catch (error) {
        console.error("Badge generation error:", error);
        const svg = generateBadgeSvg("GitPulse", "error", "#9f9f9f");
        return new NextResponse(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "no-cache",
            },
        });
    }
}

function generateBadgeSvg(label: string, message: string, color: string) {
    // Simple shields.io style flat badge
    const labelWidth = label.length * 7 + 10;
    const messageWidth = message.length * 7 + 10;
    const totalWidth = labelWidth + messageWidth;

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${messageWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${message}</text>
  </g>
</svg>`.trim();
}
