import { describe, expect, it } from "vitest";
import { formatReportCountdown, getReportExpiryState } from "@/app/report/report-expiry";

describe("report expiry helpers", () => {
    it("formats countdown in days and hours", () => {
        const now = Date.UTC(2026, 2, 9, 12, 0, 0);
        const expiresAt = now + ((2 * 24) + 5) * 60 * 60 * 1000;

        expect(formatReportCountdown(expiresAt, now)).toBe("2d 5h");
    });

    it("marks expired reports as outdated", () => {
        const now = Date.UTC(2026, 2, 9, 12, 0, 0);
        const expiresAt = now - 1;

        expect(getReportExpiryState(expiresAt, now).isExpired).toBe(true);
        expect(formatReportCountdown(expiresAt, now)).toBe("Outdated");
    });
});
