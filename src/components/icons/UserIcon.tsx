import { cn } from "@/lib/utils";
import Image from "next/image";

export function UserIcon({ className }: { className?: string }) {
    return (
        <Image
            src="/user-avatar.png"
            alt="User"
            width={40}
            height={40}
            className={cn("w-full h-full object-cover rounded-full", className)}
        />
    );
}
