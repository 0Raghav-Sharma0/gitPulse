"use client";

import { motion } from "framer-motion";
import { History, ArrowUpRight, Search, ShieldAlert, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Scan {
    id: string;
    owner: string;
    repo: string;
    timestamp: number;
    depth: string;
    summary: {
        high: number;
        medium: number;
        low: number;
        total: number;
    };
}

export default function RecentScans({ userId, limit, showViewAll = false }: { userId?: string; limit?: number; showViewAll?: boolean }) {
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchScans = async () => {
            try {
                const query = typeof limit === "number" && limit > 0 ? `?limit=${limit}` : "";
                const res = await fetch(`/api/dashboard/scans${query}`);
                const data = await res.json();
                if (data.scans) {
                    setScans(data.scans);
                }
            } catch (err) {
                console.error("Failed to fetch scans:", err);
                toast.error("Failed to load recent scans");
            } finally {
                setLoading(false);
            }
        };

        fetchScans();
    }, [userId, limit]);

    if (loading) {
        return (
            <div className="rounded-3xl bg-[#FEF9F2] border-2 border-black/5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent animate-spin rounded-full" />
                <p className="text-gray-600 animate-pulse">Fetching your history...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl bg-[#FEF9F2] border-2 border-black/5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col"
        >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    <h2 className="font-bold text-xl">Recent Scans</h2>
                </div>
                <div className="flex items-center gap-3">
                    {showViewAll && (
                        <Link
                            href="/dashboard/scans"
                            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            View all
                        </Link>
                    )}
                    {scans.length > 0 && (
                        <span className="px-3 py-1 bg-white text-gray-700 border border-gray-200 rounded-full text-xs">
                            {scans.length} {scans.length === 1 ? "Scan" : "Scans"}
                        </span>
                    )}
                </div>
            </div>

            {scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                        <Search className="w-8 h-8" />
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">No scans yet</h3>
                    <p className="text-gray-600 text-sm mb-6 max-w-[240px]">
                        Start exploring repositories to see them listed here.
                    </p>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-all text-sm"
                    >
                        Scan a Repo
                        <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {scans.map((scan) => (
                        <Link
                            key={scan.id}
                            href={`/report/${scan.id}`}
                            className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`p-3 rounded-xl ${
                                        scan.summary.high > 0
                                            ? "bg-red-50 text-red-600 border border-red-200"
                                            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                    }`}
                                >
                                    {scan.summary.high > 0 ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-500 transition-colors">
                                            {scan.owner}/{scan.repo}
                                        </h4>
                                        <span
                                            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                                scan.depth === "deep"
                                                    ? "border-purple-300 text-purple-700 bg-purple-50"
                                                    : "border-gray-300 text-gray-700 bg-gray-50"
                                            }`}
                                        >
                                            {scan.depth}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                        <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                                        <div className="flex gap-2">
                                            {scan.summary.high > 0 && (
                                                <span className="text-red-600">{scan.summary.high} High</span>
                                            )}
                                            {scan.summary.medium > 0 && (
                                                <span className="text-amber-600">{scan.summary.medium} Med</span>
                                            )}
                                            {scan.summary.low > 0 && (
                                                <span className="text-blue-600">{scan.summary.low} Low</span>
                                            )}
                                            {scan.summary.total === 0 && (
                                                <span className="text-emerald-600 font-medium">Secure</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-gray-900 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </Link>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
