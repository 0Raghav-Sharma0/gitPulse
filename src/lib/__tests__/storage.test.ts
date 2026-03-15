import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── localStorage mock ────────────────────────────────────────────────────────

const _store: Record<string, string> = {};

vi.stubGlobal("localStorage", {
    getItem(key: string): string | null { return _store[key] ?? null; },
    setItem(key: string, value: string): void { _store[key] = value; },
    removeItem(key: string): void { delete _store[key]; },
    clear(): void { Object.keys(_store).forEach(k => delete _store[k]); },
    get length(): number { return Object.keys(_store).length; },
    key(i: number): string | null { return Object.keys(_store)[i] ?? null; },
});

// Mock axios so cloud storage calls don't throw
vi.mock("axios", () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: { success: true } }),
        delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
}));

import {
    formatStorageSize,
    getStorageSize,
    getAllConversationKeys,
    getStorageStats,
    saveConversation,
    loadConversation,
    clearConversation,
} from "@/lib/storage";

beforeEach(() => {
    Object.keys(_store).forEach(k => delete _store[k]);
    vi.clearAllMocks();
});

// ─── formatStorageSize ────────────────────────────────────────────────────────

describe("formatStorageSize", () => {
    it("formats as KB when under 1 MB", () => {
        const result = formatStorageSize(2048);
        expect(result).toContain("KB");
    });

    it("formats 1 KB correctly", () => {
        expect(formatStorageSize(1024)).toBe("1.0 KB");
    });

    it("formats megabytes", () => {
        expect(formatStorageSize(1024 * 1024)).toContain("MB");
    });
});

// ─── getStorageSize ───────────────────────────────────────────────────────────

describe("getStorageSize", () => {
    it("returns a non-negative number", () => {
        const size = getStorageSize();
        expect(size).toBeGreaterThanOrEqual(0);
    });

    it("increases after saving an item", async () => {
        const before = getStorageSize();
        await saveConversation("owner", "repo", [
            { id: "1", role: "user", content: "hello world" },
        ]);
        const after = getStorageSize();
        expect(after).toBeGreaterThan(before);
    });
});

// ─── getAllConversationKeys ────────────────────────────────────────────────────

describe("getAllConversationKeys", () => {
    it("returns empty array when nothing stored", () => {
        const keys = getAllConversationKeys();
        expect(Array.isArray(keys)).toBe(true);
    });

    it("returns a key after saving a conversation", async () => {
        await saveConversation("octocat", "testrepo", [
            { id: "1", role: "user", content: "test" },
        ]);
        const keys = getAllConversationKeys();
        expect(keys.length).toBeGreaterThan(0);
    });
});

// ─── saveConversation / loadConversation ──────────────────────────────────────

describe("saveConversation and loadConversation", () => {
    it("round-trips messages correctly", async () => {
        const messages = [
            { id: "1", role: "user" as const, content: "Hello" },
            { id: "2", role: "model" as const, content: "Hi there!" },
        ];
        await saveConversation("octocat", "myrepo", messages);

        const loaded = await loadConversation("octocat", "myrepo");
        expect(loaded).not.toBeNull();
        expect(loaded!.length).toBe(2);
        expect(loaded![0].content).toBe("Hello");
        expect(loaded![1].content).toBe("Hi there!");
    });

    it("returns null for non-existent conversation", async () => {
        const result = await loadConversation("nobody", "norepo");
        expect(result).toBeNull();
    });

    it("loads legacy payloads and preserves extra optional fields", async () => {
        localStorage.setItem("gitpulse_chat_owner_repo", JSON.stringify({
            owner: "owner",
            repo: "repo",
            timestamp: Date.now(),
            messages: [
                { id: "1", role: "user", content: "hello" },
                { id: "2", role: "model", content: "world", modelUsed: "thinking" },
                { id: "invalid", role: "system", content: "skip" },
            ],
        }));

        const loaded = await loadConversation("owner", "repo");
        expect(loaded).not.toBeNull();
        expect(loaded).toHaveLength(2);
        expect(loaded?.[0]).toMatchObject({ id: "1", role: "user", content: "hello" });

        const second = loaded?.[1] as Record<string, unknown>;
        expect(second.modelUsed).toBe("thinking");
    });
});

// ─── clearConversation ────────────────────────────────────────────────────────

describe("clearConversation", () => {
    it("clears a saved conversation", async () => {
        const messages = [{ id: "1", role: "user" as const, content: "to be cleared" }];
        await saveConversation("owner", "repo", messages);
        await clearConversation("owner", "repo");

        const result = await loadConversation("owner", "repo");
        expect(result).toBeNull();
    });
});

// ─── getStorageStats ──────────────────────────────────────────────────────────

describe("getStorageStats", () => {
    it("returns an object with required numeric fields", () => {
        const stats = getStorageStats();
        expect(typeof stats.used).toBe("number");
        expect(typeof stats.available).toBe("number");
        expect(typeof stats.conversations).toBe("number");
        expect(typeof stats.percentage).toBe("number");
    });

    it("percentage is between 0 and 100", () => {
        const stats = getStorageStats();
        expect(stats.percentage).toBeGreaterThanOrEqual(0);
        expect(stats.percentage).toBeLessThanOrEqual(100);
    });

    it("used increases after saving data", async () => {
        const before = getStorageStats().used;
        await saveConversation("u", "r", [
            { id: "x", role: "user", content: "some message for storage" },
        ]);
        const after = getStorageStats().used;
        expect(after).toBeGreaterThan(before);
    });
});
