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
            <div className="h-8 w-20 bg-[#FEF9F2] animate-pulse rounded-full border border-black" />
        );
    }

    if (session) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center rounded-full bg-white border border-black hover:bg-[#F9C79A] transition-all group overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                >
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-black group-hover:border-amber-500 transition-colors">
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
                                className="absolute right-0 mt-2 w-48 bg-[#FEF9F2] border-2 border-black rounded-xl p-2 shadow-2xl z-50 backdrop-blur-xl"
                            >
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-800 hover:text-gray-900 hover:bg-[#F9C79A] rounded-lg transition-all group font-medium"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <LayoutDashboard className="w-4 h-4 group-hover:text-amber-600" />
                                    <span>Dashboard</span>
                                </Link>
                                <div className="h-px bg-black/10 my-1" />
                                <button
                                    onClick={() => {
                                        signOut();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-800 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-black font-bold text-gray-900 hover:bg-[#F9C79A] transition-all text-xs md:text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 group"
        >
            <Github className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-900" />
            <span>Sign in with GitHub</span>
        </button>
    );
}
