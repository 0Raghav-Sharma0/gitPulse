"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Github, LogOut, LayoutDashboard, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthButton() {
    const { data: session, status } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (status === "loading") {
        return (
            <div className="h-8 w-20 bg-white animate-pulse rounded-lg border border-black" />
        );
    }

    if (session) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center rounded-lg bg-white border border-black hover:bg-[#DD9651]/10 transition-colors group overflow-hidden"
                >
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-black group-hover:border-[#DD9651] transition-colors">
                        {session.user?.image ? (
                            <Image
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                width={40}
                                height={40}
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-[#FEF9F2] flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-600" />
                            </div>
                        )}
                    </div>
                </button>

                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 z-40"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-48 bg-white border border-black rounded-xl p-2 shadow-xl z-50"
                            >
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-black hover:bg-[#DD9651]/15 rounded-lg transition-colors group font-medium"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <LayoutDashboard className="w-4 h-4 group-hover:text-[#DD9651]" />
                                    <span>Dashboard</span>
                                </Link>
                                <div className="h-px bg-black/10 my-1" />
                                <button
                                    onClick={() => {
                                        signOut();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-black hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("github")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black font-bold text-black hover:bg-[#DD9651] hover:text-white transition-colors text-xs md:text-sm group"
        >
            <Github className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Sign in with GitHub</span>
        </button>
    );
}
