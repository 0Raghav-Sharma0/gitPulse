"use client";

import { useEffect, useState } from "react";
import { Users, Search, Shield } from "lucide-react";
import { fetchPublicStats } from "@/app/actions";

export default function PublicStats() {
    const [stats, setStats] = useState<{ totalVisitors: number; totalQueries: number; totalScans: number } | null>(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const data = await fetchPublicStats();
                if (mounted) setStats(data);
            } catch (error) {
                console.error(error);
            }
        };

        void load();
        const intervalId = setInterval(() => {
            void load();
        }, 300_000);

        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, []);

    if (!stats) {
        return (
            <div className="flex flex-wrap justify-center gap-4 mt-8 md:mt-12 text-sm text-gray-600 font-medium">
                <div className="flex items-center gap-2 bg-[#FEF9F2] border-2 border-black px-4 py-2 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] animate-pulse">
                    <div className="w-4 h-4 rounded-full bg-[#F9C79A]" />
                    <div className="w-8 h-4 bg-gray-300 rounded" />
                    <div className="w-16 h-4 bg-gray-300 rounded" />
                </div>
                <div className="flex items-center gap-2 bg-[#FEF9F2] border-2 border-black px-4 py-2 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] animate-pulse">
                    <div className="w-4 h-4 rounded-full bg-[#F9C79A]" />
                    <div className="w-8 h-4 bg-gray-300 rounded" />
                    <div className="w-24 h-4 bg-gray-300 rounded" />
                </div>
                <div className="flex items-center gap-2 bg-[#FEF9F2] border-2 border-black px-4 py-2 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] animate-pulse">
                    <div className="w-4 h-4 rounded-full bg-[#F9C79A]" />
                    <div className="w-8 h-4 bg-gray-300 rounded" />
                    <div className="w-20 h-4 bg-gray-300 rounded" />
                </div>
            </div>
        );
    }

    const formatStat = (num: number) => {
        if (num < 10) return num.toString();
        const rounded = Math.floor(num / 5) * 5;
        return `${rounded.toLocaleString()}+`;
    };

    return (
        <div className="flex flex-wrap justify-center gap-4 mt-8 md:mt-12 text-sm text-gray-700 font-medium">
            <div className="flex items-center gap-2 bg-[#FEF9F2] border-2 border-black px-4 py-2 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <Users className="w-4 h-4 text-gray-900" />
                <span className="font-semibold text-gray-900">
                    {formatStat(stats.totalVisitors)}
                </span>
                <span>Developers</span>
            </div>

            <div className="flex items-center gap-2 bg-[#FEF9F2] border-2 border-black px-4 py-2 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <Search className="w-4 h-4 text-gray-900" />
                <span className="font-semibold text-gray-900">
                    {formatStat(stats.totalQueries)}
                </span>
                <span>Search Queries</span>
            </div>

            <div className="flex items-center gap-2 bg-[#FEF9F2] border-2 border-black px-4 py-2 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <Shield className="w-4 h-4 text-gray-900" />
                <span className="font-semibold text-gray-900">
                    {formatStat(stats.totalScans)}
                </span>
                <span>Security Scans</span>
            </div>
        </div>
    );
}
