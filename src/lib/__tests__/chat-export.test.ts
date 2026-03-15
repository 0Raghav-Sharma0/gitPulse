import { describe, it, expect, vi } from "vitest";
import { buildChatMarkdown, convertChartsToImages } from "@/lib/chat-export";

describe("buildChatMarkdown", () => {
    const baseOptions = {
        title: "GitPulse Chat",
        contextLabel: "owner/repo",
        messages: [],
        exportedAt: new Date("2024-01-15T12:00:00Z"),
    };

    it("includes the title as an H1", () => {
        const result = buildChatMarkdown(baseOptions);
        expect(result).toContain("# GitPulse Chat");
    });

    it("includes context label in metadata", () => {
        const result = buildChatMarkdown(baseOptions);
        expect(result).toContain("owner/repo");
    });

    it("includes export timestamp", () => {
        const result = buildChatMarkdown(baseOptions);
        expect(result).toContain("2024-01-15T12:00:00.000Z");
    });

    it("includes message count", () => {
        const result = buildChatMarkdown({ ...baseOptions, messages: [{ role: "user", content: "Hi" }] });
        expect(result).toContain("Messages: 1");
    });

    it("labels user messages correctly", () => {
        const result = buildChatMarkdown({
            ...baseOptions,
            messages: [{ role: "user", content: "Hello there" }],
        });
        expect(result).toContain("## User Query 1");
        expect(result).toContain("Hello there");
    });

    it("labels model messages correctly", () => {
        const result = buildChatMarkdown({
            ...baseOptions,
            messages: [{ role: "model", content: "Hi back" }],
        });
        expect(result).toContain("## AI Response 1");
        expect(result).toContain("Hi back");
    });

    it("numbers turns independently for user and model", () => {
        const result = buildChatMarkdown({
            ...baseOptions,
            messages: [
                { role: "user", content: "Q1" },
                { role: "model", content: "A1" },
                { role: "user", content: "Q2" },
                { role: "model", content: "A2" },
            ],
        });
        expect(result).toContain("## User Query 1");
        expect(result).toContain("## User Query 2");
        expect(result).toContain("## AI Response 1");
        expect(result).toContain("## AI Response 2");
    });

    it("shows placeholder for empty message content", () => {
        const result = buildChatMarkdown({
            ...baseOptions,
            messages: [{ role: "user", content: "" }],
        });
        expect(result).toContain("_(empty message)_");
    });

    it("includes relevant files when present", () => {
        const result = buildChatMarkdown({
            ...baseOptions,
            messages: [
                {
                    role: "user",
                    content: "What does this do?",
                    relevantFiles: ["src/index.ts", "src/utils.ts"],
                },
            ],
        });
        expect(result).toContain("Relevant files");
        expect(result).toContain("src/index.ts");
        expect(result).toContain("src/utils.ts");
    });

    it("does not include relevant files section when array is empty", () => {
        const result = buildChatMarkdown({
            ...baseOptions,
            messages: [{ role: "user", content: "Hello", relevantFiles: [] }],
        });
        expect(result).not.toContain("Relevant files");
    });
});

describe("convertChartsToImages", () => {
    it("passes through content with no mermaid blocks", async () => {
        const content = "# Hello\n\nJust text, no diagrams.";
        const mockRender = vi.fn().mockResolvedValue("<svg>mock</svg>");
        const result = await convertChartsToImages(content, { renderMermaid: mockRender });
        expect(result).toBe(content);
        expect(mockRender).not.toHaveBeenCalled();
    });

    it("replaces mermaid blocks with SVG data URIs", async () => {
        const content = "Before\n```mermaid\nflowchart TD\n  A-->B\n```\nAfter";
        const mockSvg = "<svg>diagram</svg>";
        const mockRender = vi.fn().mockResolvedValue(mockSvg);
        const result = await convertChartsToImages(content, { renderMermaid: mockRender });
        expect(result).toContain("data:image/svg+xml");
        expect(result).toContain("Before");
        expect(result).toContain("After");
        expect(result).not.toContain("```mermaid");
    });

    it("falls back to original block when render throws", async () => {
        const content = "```mermaid\nbroken diagram\n```";
        const mockRender = vi.fn().mockRejectedValue(new Error("render failed"));
        const result = await convertChartsToImages(content, { renderMermaid: mockRender });
        // Should contain the original block on failure
        expect(result).toContain("broken diagram");
    });

    it("handles mermaid-json blocks by converting via converter", async () => {
        const content = '```mermaid-json\n{"nodes":[],"edges":[]}\n```';
        const mockRender = vi.fn().mockResolvedValue("<svg>json diagram</svg>");
        const mockConverter = vi.fn().mockReturnValue("flowchart TD\n  A-->B");
        await convertChartsToImages(content, {
            renderMermaid: mockRender,
            convertMermaidJson: mockConverter,
        });
        expect(mockConverter).toHaveBeenCalled();
        expect(mockRender).toHaveBeenCalled();
    });

    it("keeps mermaid-json block when no converter provided", async () => {
        const block = '```mermaid-json\n{"nodes":[]}\n```';
        const mockRender = vi.fn();
        expect(await convertChartsToImages(block, { renderMermaid: mockRender })).toContain("mermaid-json");
        expect(mockRender).not.toHaveBeenCalled();
    });
});
