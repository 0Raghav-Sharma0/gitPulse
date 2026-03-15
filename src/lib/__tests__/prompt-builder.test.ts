import { describe, it, expect } from "vitest";
import { buildGitPulsePrompt, formatHistoryText } from "@/lib/prompt-builder";

describe("buildGitPulsePrompt", () => {
    const baseParams = {
        question: "What does this repo do?",
        context: "package.json: { name: 'myapp' }",
        repoDetails: { owner: "octocat", repo: "myproject" },
        historyText: "",
    };

    it("contains the user's question", () => {
        const result = buildGitPulsePrompt(baseParams);
        expect(result).toContain("What does this repo do?");
    });

    it("includes the repository owner and name", () => {
        const result = buildGitPulsePrompt(baseParams);
        expect(result).toContain("octocat");
        expect(result).toContain("myproject");
    });

    it("includes the full GitHub URL", () => {
        const result = buildGitPulsePrompt(baseParams);
        expect(result).toContain("https://github.com/octocat/myproject");
    });

    it("includes the context string", () => {
        const result = buildGitPulsePrompt(baseParams);
        expect(result).toContain("package.json");
    });

    it("includes conversation history when provided", () => {
        const result = buildGitPulsePrompt({
            ...baseParams,
            historyText: "User: Hello\n\nGitPulse: Hi there",
        });
        expect(result).toContain("User: Hello");
        expect(result).toContain("GitPulse: Hi there");
    });

    it("returns a non-empty string", () => {
        const result = buildGitPulsePrompt(baseParams);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(100);
    });

    it("includes GitPulse persona instructions", () => {
        const result = buildGitPulsePrompt(baseParams);
        expect(result).toContain("GitPulse");
    });
});

describe("formatHistoryText", () => {
    it("returns empty string for empty history", () => {
        expect(formatHistoryText([])).toBe("");
    });

    it("formats a single user message", () => {
        const result = formatHistoryText([
            { role: "user", content: "Hello, world!" },
        ]);
        expect(result).toContain("User: Hello, world!");
    });

    it("formats a single model message", () => {
        const result = formatHistoryText([
            { role: "model", content: "Hi back!" },
        ]);
        expect(result).toContain("GitPulse: Hi back!");
    });

    it("formats multi-turn conversation with separator", () => {
        const result = formatHistoryText([
            { role: "user", content: "Q1" },
            { role: "model", content: "A1" },
            { role: "user", content: "Q2" },
        ]);
        expect(result).toContain("User: Q1");
        expect(result).toContain("GitPulse: A1");
        expect(result).toContain("User: Q2");
    });

    it("uses correct labels for each role", () => {
        const result = formatHistoryText([
            { role: "user", content: "x" },
            { role: "model", content: "y" },
        ]);
        expect(result).toMatch(/User:/);
        expect(result).toMatch(/GitPulse:/);
    });
});
