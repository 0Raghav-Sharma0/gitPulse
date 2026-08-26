import { kv } from "@vercel/kv";

export function isKvConfigured(): boolean {
    return Boolean(
        process.env.KV_REST_API_URL?.trim() &&
            process.env.KV_REST_API_TOKEN?.trim(),
    );
}

export async function safeKvOperation<T>(
    operation: () => Promise<T>,
): Promise<T | null> {
    if (!isKvConfigured()) {
        return null;
    }

    try {
        return await operation();
    } catch (error) {
        console.warn("KV operation failed (gracefully degrading):", error);
        return null;
    }
}

export async function kvGet<T>(key: string): Promise<T | null> {
    return safeKvOperation(() => kv.get<T>(key));
}

export async function kvIncr(key: string): Promise<number | null> {
    return safeKvOperation(() => kv.incr(key));
}

export async function kvExpire(
    key: string,
    seconds: number,
): Promise<number | null> {
    return safeKvOperation(() => kv.expire(key, seconds));
}
