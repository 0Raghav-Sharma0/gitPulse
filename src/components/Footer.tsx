"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function Footer() {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com";

    const handleCopy = () => {
        navigator.clipboard.writeText(email);
        setCopied(true);
        toast.success("Email copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <footer className="relative z-10 py-8 border-t-2 border-black bg-white/50 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-gray-600 text-sm font-medium">
                    © {new Date().getFullYear()} GitPulse. All rights reserved.
                </p>

                <div className="flex items-center gap-6">
                    <a
                        href="/blog"
                        className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                        Insights
                    </a>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FEF9F2] border-2 border-black text-gray-800 hover:bg-[#F9C79A] transition-all text-sm font-semibold group shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                    >
                        <MessageSquarePlus className="w-4 h-4 group-hover:text-amber-600 transition-colors" />
                        <span>Request a feature / Report a bug</span>
                    </button>
                </div>
            </div>

            {/* Contact Popup */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
                                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
                                className="fixed left-1/2 top-1/2 w-full max-w-md bg-[#FEF9F2] border-2 border-black rounded-2xl p-6 shadow-2xl z-[101]"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-semibold text-gray-900">Get in touch</h3>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-[#F9C79A] rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-gray-700 mb-6 font-medium">
                                    Found a bug or have a feature request? We&apos;d love to hear from you! Drop us an email at:
                                </p>

                                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-black group">
                                    <code className="flex-1 text-gray-800 font-mono text-sm break-all">
                                        {email}
                                    </code>
                                    <button
                                        onClick={handleCopy}
                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-[#F9C79A] rounded-lg transition-colors"
                                        title="Copy email"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => window.location.href = `mailto:${email}`}
                                        className="px-4 py-2 bg-[#F9C79A] text-black font-bold border-2 border-black rounded-lg hover:bg-amber-400 transition-colors text-sm shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                                    >
                                        Send Email
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </footer>
    );
}
