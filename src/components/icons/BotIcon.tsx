import { cn } from "@/lib/utils";
import CodeIcon from "@/components/CodeIcon";

export function BotIcon({ className }: { className?: string }) {
    return <CodeIcon className={cn("w-full h-full", className)} />;
}
