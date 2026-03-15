import { describe, it, expect } from "vitest";
import { repairMarkdown } from "@/lib/markdown-utils";

describe("repairMarkdown", () => {
    it("passes through content with no code blocks unchanged", () => {
        const md = "# Hello\n\nThis is plain text with no code.";
        expect(repairMarkdown(md)).toBe(md);
    });

    it("passes through well-formed code blocks", () => {
        const md = "Here is code:\n```ts\nconst x = 1;\n```\nDone.";
        // Should not break valid markdown
        const result = repairMarkdown(md);
        expect(result).toContain("```ts");
        expect(result).toContain("const x = 1;");
    });

    it("repairs code blocks containing inner triple backticks", () => {
        // A markdown block that contains ``` inside it needs longer outer fence
        const md = "````md\n```js\nconst x = 1;\n```\n````";
        const result = repairMarkdown(md);
        // The outer fences need to be >= length of inner
        expect(result).toContain("```");
    });

    it("closes an unclosed code block", () => {
        const md = "Some text\n```ts\nconst x = 1;\n// no closing fence";
        const result = repairMarkdown(md);
        // Should have an even number of fences (or an appended closer)
        const fences = (result.match(/^```/gm) || []).length;
        expect(fences % 2).toBe(0);
    });

    it("does not modify content with no backticks at all", () => {
        const md = "No code here, just text.";
        expect(repairMarkdown(md)).toBe(md);
    });

    it("handles empty string", () => {
        expect(repairMarkdown("")).toBe("");
    });

    it("preserves info strings on opening fences", () => {
        const md = "```typescript\nconst y: number = 2;\n```";
        const result = repairMarkdown(md);
        expect(result).toContain("typescript");
    });

    it("handles multiple independent code blocks", () => {
        const md = "```ts\nconst a = 1;\n```\n\nSome text\n\n```py\nprint('hi')\n```";
        const result = repairMarkdown(md);
        expect(result).toContain("const a = 1;");
        expect(result).toContain("print('hi')");
    });
});
