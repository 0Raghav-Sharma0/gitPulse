import { describe, it, expect } from "vitest";
import { pruneFilePaths } from "@/lib/services/query-pipeline";

describe("pruneFilePaths", () => {
    it("filters out common binary and generated patterns", () => {
        const paths = [
            "src/index.ts",
            "public/logo.png",
            "public/icon.jpg",
            "dist/bundle.min.js",
            "package-lock.json",
            "src/styles.css",
            "assets/font.woff2",
        ];
        const result = pruneFilePaths(paths);
        // Binary/generated files should be removed
        expect(result).not.toContain("public/logo.png");
        expect(result).not.toContain("public/icon.jpg");
        expect(result).not.toContain("dist/bundle.min.js");
        expect(result).not.toContain("package-lock.json");
        expect(result).not.toContain("assets/font.woff2");
    });

    it("preserves source code files", () => {
        const paths = ["src/index.ts", "src/utils.js", "src/app.tsx", "lib/helpers.ts"];
        const result = pruneFilePaths(paths);
        expect(result).toContain("src/index.ts");
        expect(result).toContain("src/utils.js");
        expect(result).toContain("src/app.tsx");
    });

    it("filters out map files", () => {
        const paths = ["dist/app.js.map", "src/main.ts"];
        const result = pruneFilePaths(paths);
        expect(result).not.toContain("dist/app.js.map");
        expect(result).toContain("src/main.ts");
    });

    it("filters out wasm files", () => {
        const paths = ["lib/crypto.wasm", "src/crypto.ts"];
        const result = pruneFilePaths(paths);
        expect(result).not.toContain("lib/crypto.wasm");
        expect(result).toContain("src/crypto.ts");
    });

    it("returns empty array for empty input", () => {
        expect(pruneFilePaths([])).toEqual([]);
    });

    it("filters out pdf and zip files", () => {
        const paths = ["docs/manual.pdf", "release/v1.0.zip", "src/index.ts"];
        const result = pruneFilePaths(paths);
        expect(result).not.toContain("docs/manual.pdf");
        expect(result).not.toContain("release/v1.0.zip");
    });
});
