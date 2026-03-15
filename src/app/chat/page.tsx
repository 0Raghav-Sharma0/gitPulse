import { ProfileLoader } from "@/components/ProfileLoader";
import { RepoLoader } from "@/components/RepoLoader";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
    alternates: {
        canonical: "/chat",
    },
};

export default async function ChatPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; prompt?: string }>;
}) {
    const { q: query, prompt } = await searchParams;

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] text-gray-900 gap-4 p-4">
                <Search className="w-12 h-12 text-gray-500" />
                <h1 className="text-2xl font-bold">No Query Provided</h1>
                <p className="text-gray-600 text-center">Please search for a GitHub user or repository</p>
                <Link href="/" className="mt-4 px-6 py-3 bg-[#F9C79A] text-gray-900 font-bold border-2 border-black rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>
        );
    }

    // If it's a profile query (no slash), load immediately with ProfileLoader
    if (!query.includes("/")) {
        return <ProfileLoader username={query} />;
    }

    // For repos, use RepoLoader for client-side loading
    return <RepoLoader query={query} initialPrompt={prompt} />;
}
