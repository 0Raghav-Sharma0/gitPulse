"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import Link from "next/link";

interface LoginFormProps {
    callbackUrl: string;
    configError: string | null;
}

const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const githubCallbackUrl = `${appBaseUrl}/api/auth/callback/github`;

export function LoginForm({ callbackUrl, configError }: LoginFormProps) {
    if (configError) {
        return (
            <LoginCard>
                <h1 className="font-display text-2xl font-bold mb-2 text-red-700">
                    GitHub sign-in is not configured
                </h1>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">{configError}</p>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-6">
                    <li>
                        Open{" "}
                        <a
                            href="https://github.com/settings/developers"
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-medium"
                        >
                            GitHub Developer Settings
                        </a>
                    </li>
                    <li>Create an OAuth App (or open your existing one)</li>
                    <li>
                        Set the callback URL to{" "}
                        <code className="bg-white px-1 py-0.5 rounded border border-gray-300 text-xs break-all">
                            {githubCallbackUrl}
                        </code>
                    </li>
                    <li>
                        Copy the <strong>Client ID</strong> and <strong>Client secret</strong> into{" "}
                        <code className="bg-white px-1 py-0.5 rounded border border-gray-300 text-xs">
                            .env.local
                        </code>{" "}
                        as <code className="text-xs">AUTH_GITHUB_ID</code> and{" "}
                        <code className="text-xs">AUTH_GITHUB_SECRET</code>
                    </li>
                    <li>Restart the dev server</li>
                </ol>
                <Link href="/" className="text-sm text-gray-600 underline hover:text-gray-900">
                    Back to home
                </Link>
            </LoginCard>
        );
    }

    return (
        <LoginCard>
            <h1 className="font-display text-2xl font-bold mb-2">Sign in to GitPulse</h1>
            <p className="text-gray-600 text-sm mb-8">
                Connect your GitHub account to access dashboards, repo scans, and saved sessions.
            </p>

            <button
                type="button"
                onClick={() => signIn("github", { callbackUrl })}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
            >
                <Github className="w-5 h-5" />
                <span>Continue with GitHub</span>
            </button>

            <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/" className="underline hover:text-gray-800">
                    Back to home
                </Link>
            </p>
        </LoginCard>
    );
}

function LoginCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full max-w-md rounded-2xl border-2 border-black bg-[#FEF9F2] p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.08)]">
            {children}
        </div>
    );
}
