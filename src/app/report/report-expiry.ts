export interface ReportExpiryState {
    isExpired: boolean;
    totalMsRemaining: number;
    days: number;
    hours: number;
}

export function getReportExpiryState(expiresAt: number, now: number = Date.now()): ReportExpiryState {
    const totalMsRemaining = expiresAt - now;
    const isExpired = totalMsRemaining <= 0;
    const safeRemaining = Math.max(0, totalMsRemaining);
    const totalHours = Math.floor(safeRemaining / (60 * 60 * 1000));

    return {
        isExpired,
        totalMsRemaining,
        days: Math.floor(totalHours / 24),
        hours: totalHours % 24,
    };
}

export function formatReportCountdown(expiresAt: number, now: number = Date.now()): string {
    const state = getReportExpiryState(expiresAt, now);
    if (state.isExpired) {
        return "Outdated";
    }
    return `${state.days}d ${state.hours}h`;
}
