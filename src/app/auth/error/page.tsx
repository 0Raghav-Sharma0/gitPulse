import Link from "next/link";

const ERROR_COPY: Record<
    string,
    { title: string; description: string; hint?: string }
> = {
    Configuration: {
        title: "Sign-in could not be completed",
        description:
            "GitHub authorized the app, but the server could not finish creating your session.",
        hint: "For local dev, start Postgres with `docker compose up db -d`, run `npm run prisma:deploy`, then try again. On production, open /api/health — if database is not ok, check DATABASE_URL and DIRECT_URL in Vercel. If it still fails, check server logs for lines starting with [auth].",
    },
    AccessDenied: {
        title: "Access denied",
        description: "You are not allowed to sign in with this account.",
        hint: "If you're developing locally, ensure Postgres is running (`docker compose up db -d`) and migrations are applied (`npm run prisma:deploy`).",
    },
    Verification: {
        title: "Verification failed",
        description: "The sign-in link expired or was already used. Try again.",
    },
    Default: {
        title: "Authentication error",
        description: "Something went wrong during sign-in. Please try again.",
    },
};

interface AuthErrorPageProps {
    searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
    const params = await searchParams;
    const errorKey = params.error ?? "Default";
    const copy = ERROR_COPY[errorKey] ?? ERROR_COPY.Default;

    return (
        <main className="min-h-screen bg-[#FDFCFB] text-gray-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border-2 border-black bg-[#FEF9F2] p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.08)]">
                <h1 className="font-display text-2xl font-bold mb-2 text-red-700">
                    {copy.title}
                </h1>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                    {copy.description}
                </p>
                {copy.hint ? (
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
                        {copy.hint}
                    </p>
                ) : null}
                <p className="text-xs text-gray-500 mb-6">
                    Error code: <code className="font-mono">{errorKey}</code>
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/login"
                        className="w-full text-center px-4 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
                    >
                        Try signing in again
                    </Link>
                    <Link
                        href="/"
                        className="text-sm text-center text-gray-600 underline hover:text-gray-900"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </main>
    );
}
