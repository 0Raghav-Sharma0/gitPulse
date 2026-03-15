import { describe, it, expect } from "vitest";
import { searchFiles } from "@/lib/search-engine";

const files = [
    {
        path: "src/utils.ts",
        content: `
export function myHelper() {
    return 42;
}

export const MY_CONSTANT = "hello";
import { useState } from 'react';
`,
    },
    {
        path: "src/app.ts",
        content: `
class AppController {
    start() {}
}
function initApp() {}
`,
    },
    {
        path: "README.md",
        content: "# My Project\n\nThis is the repository README.\nFind me here.",
    },
];

describe("searchFiles — text mode", () => {
    it("finds exact phrase (case-insensitive)", () => {
        const results = searchFiles(files, { query: "repository", type: "text" });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].file).toBe("README.md");
    });

    it("matches case-insensitively by default", () => {
        const results = searchFiles(files, { query: "REPOSITORY", type: "text" });
        expect(results.length).toBeGreaterThan(0);
    });

    it("respects caseSensitive flag", () => {
        const sensitive = searchFiles(files, { query: "REPOSITORY", type: "text", caseSensitive: true });
        expect(sensitive.length).toBe(0);
        const insensitive = searchFiles(files, { query: "repository", type: "text", caseSensitive: true });
        expect(insensitive.length).toBeGreaterThan(0);
    });

    it("returns empty array when no match found", () => {
        const results = searchFiles(files, { query: "zzz_no_match_xyz", type: "text" });
        expect(results).toHaveLength(0);
    });

    it("returns correct line numbers", () => {
        const results = searchFiles([{ path: "file.ts", content: "line1\nline2\nhello world\nline4" }], {
            query: "hello world",
            type: "text",
        });
        expect(results[0]?.line).toBe(3);
    });

    it("returns matchType 'text'", () => {
        const results = searchFiles(files, { query: "README", type: "text" });
        expect(results.every(r => r.matchType === "text")).toBe(true);
    });
});

describe("searchFiles — regex mode", () => {
    it("finds matches using a regex pattern", () => {
        const results = searchFiles(files, { query: "my\\w+", type: "regex" });
        expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty array for invalid regex (graceful)", () => {
        // Invalid regex pattern should not throw — searchRegex catches internally
        const results = searchFiles(files, { query: "[invalid(regex", type: "regex" });
        expect(Array.isArray(results)).toBe(true);
    });

    it("returns matchType 'regex'", () => {
        const results = searchFiles(files, { query: "function", type: "regex" });
        expect(results.every(r => r.matchType === "regex")).toBe(true);
    });
});

describe("searchFiles — AST mode", () => {
    it("finds function declarations", () => {
        const results = searchFiles(files, {
            query: "myHelper",
            type: "ast",
            astType: "function",
        });
        const found = results.find(r => r.content.includes("myHelper"));
        expect(found).toBeDefined();
        expect(found?.matchType).toBe("ast");
        expect(found?.context).toBe("Function Declaration");
    });

    it("finds class declarations", () => {
        const results = searchFiles(files, {
            query: "AppController",
            type: "ast",
            astType: "class",
        });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].context).toBe("Class Declaration");
    });

    it("finds variable declarations", () => {
        const results = searchFiles(files, {
            query: "MY_CONSTANT",
            type: "ast",
            astType: "variable",
        });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].context).toBe("Variable Declaration");
    });

    it("finds import declarations", () => {
        const results = searchFiles(files, {
            query: "react",
            type: "ast",
            astType: "import",
        });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].context).toBe("Import");
    });

    it("skips non-JS/TS files for AST search", () => {
        const results = searchFiles(
            [{ path: "README.md", content: "function fake() {}" }],
            { query: "fake", type: "ast" }
        );
        // MD files should be skipped in AST mode
        expect(results).toHaveLength(0);
    });
});
