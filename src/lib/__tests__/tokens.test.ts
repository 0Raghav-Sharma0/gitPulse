import { describe, it, expect } from "vitest";
import {
    countTokens,
    countMessageTokens,
    formatTokenCount,
    MAX_TOKENS,
    getTokenWarningLevel,
    isRateLimitError,
    getRateLimitErrorMessage,
} from "@/lib/tokens";

describe("countTokens", () => {
    it("returns a positive number for non-empty text", () => {
        const result = countTokens("Hello, world!");
        expect(result).toBeGreaterThan(0);
    });

    it("returns 0 for an empty string", () => {
        expect(countTokens("")).toBe(0);
    });

    it("returns more tokens for longer text", () => {
        const short = countTokens("Hi");
        const long = countTokens("This is a much longer sentence with many more words and tokens in it.");
        expect(long).toBeGreaterThan(short);
    });
});

describe("countMessageTokens", () => {
    it("sums tokens across all messages", () => {
        const messages = [
            { role: "user", parts: "Hello" },
            { role: "model", parts: "Hi there" },
        ];
        const total = countMessageTokens(messages);
        expect(total).toBeGreaterThan(0);
        const single = countTokens("Hello") + countTokens("Hi there");
        expect(total).toBe(single);
    });

    it("returns 0 for empty array", () => {
        expect(countMessageTokens([])).toBe(0);
    });
});

describe("formatTokenCount", () => {
    it("formats numbers below 1000 as plain integers", () => {
        expect(formatTokenCount(0)).toBe("0");
        expect(formatTokenCount(500)).toBe("500");
        expect(formatTokenCount(999)).toBe("999");
    });

    it("formats thousands with K suffix", () => {
        expect(formatTokenCount(1000)).toBe("1.0K");
        expect(formatTokenCount(50000)).toBe("50.0K");
        expect(formatTokenCount(999999)).toBe("1000.0K");
    });

    it("formats millions with M suffix", () => {
        expect(formatTokenCount(1_000_000)).toBe("1.00M");
        expect(formatTokenCount(2_500_000)).toBe("2.50M");
    });
});

describe("getTokenWarningLevel", () => {
    it("returns 'safe' when below 70% of MAX_TOKENS", () => {
        expect(getTokenWarningLevel(0)).toBe("safe");
        expect(getTokenWarningLevel(MAX_TOKENS * 0.5)).toBe("safe");
        expect(getTokenWarningLevel(MAX_TOKENS * 0.69)).toBe("safe");
    });

    it("returns 'warning' between 70% and 90%", () => {
        expect(getTokenWarningLevel(MAX_TOKENS * 0.7)).toBe("warning");
        expect(getTokenWarningLevel(MAX_TOKENS * 0.8)).toBe("warning");
        expect(getTokenWarningLevel(MAX_TOKENS * 0.89)).toBe("warning");
    });

    it("returns 'danger' at or above 90%", () => {
        expect(getTokenWarningLevel(MAX_TOKENS * 0.9)).toBe("danger");
        expect(getTokenWarningLevel(MAX_TOKENS)).toBe("danger");
        expect(getTokenWarningLevel(MAX_TOKENS * 1.5)).toBe("danger");
    });
});

describe("isRateLimitError", () => {
    it("returns false for null/undefined", () => {
        expect(isRateLimitError(null)).toBe(false);
        expect(isRateLimitError(undefined)).toBe(false);
    });

    it("detects 429 status code", () => {
        expect(isRateLimitError({ status: 429 })).toBe(true);
        expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
    });

    it("detects rate limit message keywords", () => {
        expect(isRateLimitError({ message: "Rate limit exceeded" })).toBe(true);
        expect(isRateLimitError({ message: "Too many requests" })).toBe(true);
        expect(isRateLimitError({ message: "quota exceeded for today" })).toBe(true);
    });

    it("returns false for unrelated errors", () => {
        expect(isRateLimitError({ message: "Not found", status: 404 })).toBe(false);
        expect(isRateLimitError({ message: "Internal server error", status: 500 })).toBe(false);
    });
});

describe("getRateLimitErrorMessage", () => {
    it("returns GitHub-specific message for GitHub errors", () => {
        const msg = getRateLimitErrorMessage({ message: "GitHub API rate limit" });
        expect(msg).toMatch(/GitHub/i);
        expect(msg).toMatch(/rate limit/i);
    });

    it("returns Gemini-specific message for AI service errors", () => {
        const msg = getRateLimitErrorMessage({ message: "Gemini model quota" });
        expect(msg).toMatch(/AI service/i);
    });

    it("returns generic message for other errors", () => {
        const msg = getRateLimitErrorMessage({ message: "something else entirely" });
        expect(msg).toMatch(/rate limit/i);
    });
});
