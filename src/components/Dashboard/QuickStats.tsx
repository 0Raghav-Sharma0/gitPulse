"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Search, Activity, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function QuickStats() {
    const [statsData, setStatsData] = useState({
        reposScanned: 0,
        issuesFound: 0,
        deepScans: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                const data = await res.json();
                if (data.stats) {
                    setStatsData(data.stats);
                }
            } catch (err) {
                console.error("Failed to fetch stats:", err);
                toast.error("Failed to load quick stats");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const stats = [
        { label: "Repos Scanned", value: statsData.reposScanned.toString(), icon: Search, color: "text-blue-400", bg: "bg-blue-400" },
        { label: "Issues Found", value: statsData.issuesFound.toString(), icon: Shield, color: "text-red-400", bg: "bg-red-400" },
        { label: "Deep Scans", value: statsData.deepScans.toString(), icon: Zap, color: "text-purple-400", bg: "bg-purple-400" },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 rounded-2xl bg-[#FEF9F2] border-2 border-black/5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] h-28 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-2xl bg-[#FEF9F2] border-2 border-black/5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-white/10 transition-colors group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${stat.bg}/10 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <Activity className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                </motion.div>
            ))}

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20"
            >
                <h3 className="font-semibold text-white mb-2 italic">Pro Tip</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    Try scanning a repo with <strong>Deep Scan</strong> enabled for better architectural insights and flowcharts.
                </p>
            </motion.div>
        </div>
    );
}
