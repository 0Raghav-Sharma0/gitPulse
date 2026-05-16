import { Suspense } from "react";
import { getGitHubOAuthConfigError } from "@/lib/auth-env";
import { LoginForm } from "./LoginForm";

interface LoginPageProps {
    searchParams: Promise<{
        callbackUrl?: string;
    }>;
}

async function LoginPanel({ callbackUrl }: { callbackUrl: string }) {
    const configError = getGitHubOAuthConfigError();

    return <LoginForm callbackUrl={callbackUrl} configError={configError} />;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams;
    const callbackUrl = params.callbackUrl ?? "/";

    return (
        <main className="min-h-screen bg-[#FDFCFB] text-gray-900 flex items-center justify-center p-6">
            <Suspense
                fallback={
                    <div className="w-full max-w-md rounded-2xl border-2 border-black bg-[#FEF9F2] p-8">
                        <p className="text-gray-600">Loading…</p>
                    </div>
                }
            >
                <LoginPanel callbackUrl={callbackUrl} />
            </Suspense>
        </main>
    );
}
