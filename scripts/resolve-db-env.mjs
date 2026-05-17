/**
 * Normalize Postgres env vars for Prisma + Vercel/Neon integrations.
 * Call before PrismaClient or `prisma migrate deploy`.
 */
function stripChannelBinding(url) {
    if (!url.includes("channel_binding")) {
        return url;
    }

    try {
        const normalized = url.replace(/^postgres:\/\//, "postgresql://");
        const parsed = new URL(normalized);
        parsed.searchParams.delete("channel_binding");
        const rebuilt = parsed.toString();
        return url.startsWith("postgres://")
            ? rebuilt.replace(/^postgresql:\/\//, "postgres://")
            : rebuilt;
    } catch {
        return url
            .replace(/([?&])channel_binding=require(&|$)/g, (_, sep, tail) =>
                tail === "&" ? sep : "",
            )
            .replace(/\?&/, "?")
            .replace(/[?&]$/, "");
    }
}

function pickEnv(...keys) {
    for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) {
            return value;
        }
    }
    return undefined;
}

export function ensureDatabaseEnv() {
    const pooled = pickEnv("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL");
    const direct = pickEnv(
        "DIRECT_URL",
        "POSTGRES_URL_NON_POOLING",
        "POSTGRES_URL_UNPOOLED",
    );

    if (!process.env.DATABASE_URL && pooled) {
        process.env.DATABASE_URL = stripChannelBinding(pooled);
    }
    if (!process.env.DIRECT_URL && direct) {
        process.env.DIRECT_URL = stripChannelBinding(direct);
    }

    if (process.env.DATABASE_URL) {
        process.env.DATABASE_URL = stripChannelBinding(process.env.DATABASE_URL);
    }
    if (process.env.DIRECT_URL) {
        process.env.DIRECT_URL = stripChannelBinding(process.env.DIRECT_URL);
    }
}
