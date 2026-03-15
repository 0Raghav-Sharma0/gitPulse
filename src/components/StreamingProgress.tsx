import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface StreamingProgressProps {
    message: string;
    progress: number;
}

export function StreamingProgress({ message, progress }: StreamingProgressProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-zinc-400">{message}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}
