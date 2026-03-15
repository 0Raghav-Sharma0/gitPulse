import { describe, it, expect } from "vitest";
import {
    isImageFile,
    isVideoFile,
    isBinaryFile,
    getFileCategory,
    shouldSkipFile,
    getFileTreeStats,
    formatFileSize,
} from "@/lib/file-filters";
import type { FileNode } from "@/lib/file-filters";

const makeNode = (p: string, size = 0, type: "blob" | "tree" = "blob"): FileNode => ({
    path: p,
    sha: "abc",
    type,
    size,
});

describe("isImageFile", () => {
    it("returns true for image extensions", () => {
        expect(isImageFile("photo.jpg")).toBe(true);
        expect(isImageFile("icon.PNG")).toBe(true);
        expect(isImageFile("diagram.svg")).toBe(true);
        expect(isImageFile("image.webp")).toBe(true);
    });
    it("returns false for non-images", () => {
        expect(isImageFile("index.ts")).toBe(false);
        expect(isImageFile("video.mp4")).toBe(false);
        expect(isImageFile("readme.md")).toBe(false);
    });
});

describe("isVideoFile", () => {
    it("returns true for video extensions", () => {
        expect(isVideoFile("clip.mp4")).toBe(true);
        expect(isVideoFile("demo.MOV")).toBe(true);
        expect(isVideoFile("screen.webm")).toBe(true);
    });
    it("returns false for images and code files", () => {
        expect(isVideoFile("photo.jpg")).toBe(false);
        expect(isVideoFile("app.ts")).toBe(false);
    });
});

describe("isBinaryFile", () => {
    it("returns true for binary/font extensions", () => {
        expect(isBinaryFile("program.exe")).toBe(true);
        expect(isBinaryFile("library.dll")).toBe(true);
        expect(isBinaryFile("font.woff2")).toBe(true);
        expect(isBinaryFile("archive.zip")).toBe(true);
        expect(isBinaryFile("module.wasm")).toBe(true);
    });
    it("returns false for code files", () => {
        expect(isBinaryFile("main.ts")).toBe(false);
        expect(isBinaryFile("styles.css")).toBe(false);
    });
});

describe("getFileCategory", () => {
    it("categorizes JavaScript/TypeScript files", () => {
        expect(getFileCategory("app.js")).toBe("javascript");
        expect(getFileCategory("app.tsx")).toBe("javascript");
        expect(getFileCategory("util.ts")).toBe("javascript");
    });
    it("categorizes Python files", () => {
        expect(getFileCategory("script.py")).toBe("python");
    });
    it("categorizes Java files", () => {
        expect(getFileCategory("Main.java")).toBe("java");
    });
    it("categorizes stylesheet files", () => {
        expect(getFileCategory("styles.css")).toBe("stylesheet");
        expect(getFileCategory("theme.scss")).toBe("stylesheet");
    });
    it("categorizes HTML files", () => {
        expect(getFileCategory("index.html")).toBe("html");
    });
    it("categorizes markdown files", () => {
        expect(getFileCategory("README.md")).toBe("markdown");
    });
    it("categorizes config files", () => {
        expect(getFileCategory("package.json")).toBe("config");
        expect(getFileCategory("config.yaml")).toBe("config");
    });
    it("returns 'other' for unknown extensions", () => {
        expect(getFileCategory("data.xyz")).toBe("other");
    });
    it("categorizes image files", () => {
        expect(getFileCategory("logo.png")).toBe("image");
    });
    it("categorizes video files", () => {
        expect(getFileCategory("demo.mp4")).toBe("video");
    });
});

describe("shouldSkipFile", () => {
    it("skips files over 1MB", () => {
        expect(shouldSkipFile(makeNode("large.ts", 1_100_000))).toBe(true);
    });
    it("does not skip files under 1MB", () => {
        expect(shouldSkipFile(makeNode("small.ts", 500))).toBe(false);
    });
    it("always skips video files regardless of size", () => {
        expect(shouldSkipFile(makeNode("video.mp4", 100))).toBe(true);
    });
    it("skips images over 500KB", () => {
        expect(shouldSkipFile(makeNode("big.jpg", 600_000))).toBe(true);
    });
    it("does not skip small images", () => {
        expect(shouldSkipFile(makeNode("small.jpg", 100_000))).toBe(false);
    });
    it("skips binary files", () => {
        expect(shouldSkipFile(makeNode("app.exe", 100))).toBe(true);
    });
    it("skips lock files", () => {
        expect(shouldSkipFile(makeNode("package-lock.json", 1000))).toBe(true);
        expect(shouldSkipFile(makeNode("yarn.lock", 1000))).toBe(true);
        expect(shouldSkipFile(makeNode("Gemfile.lock", 1000))).toBe(true);
    });
    it("skips minified files", () => {
        expect(shouldSkipFile(makeNode("bundle.min.js", 100))).toBe(true);
        expect(shouldSkipFile(makeNode("styles.min.css", 100))).toBe(true);
    });
    it("does not skip regular code files", () => {
        expect(shouldSkipFile(makeNode("index.ts", 5000))).toBe(false);
    });
});

describe("getFileTreeStats", () => {
    it("returns correct total count", () => {
        const nodes: FileNode[] = [
            makeNode("a.ts", 100),
            makeNode("b.js", 200),
            makeNode("src", 0, "tree"),
        ];
        const stats = getFileTreeStats(nodes);
        expect(stats.total).toBe(3);
    });

    it("counts skipped files", () => {
        const nodes: FileNode[] = [
            makeNode("app.ts", 100),
            makeNode("bundle.min.js", 100),
            makeNode("app.exe", 100),
        ];
        const stats = getFileTreeStats(nodes);
        expect(stats.skipped).toBe(2);
    });

    it("calculates total size from blobs", () => {
        const nodes: FileNode[] = [
            makeNode("a.ts", 500),
            makeNode("b.ts", 300),
        ];
        const stats = getFileTreeStats(nodes);
        expect(stats.totalSize).toBe(800);
    });

    it("categorizes files by type", () => {
        const nodes: FileNode[] = [
            makeNode("a.ts", 100),
            makeNode("b.ts", 100),
            makeNode("c.py", 100),
        ];
        const stats = getFileTreeStats(nodes);
        expect(stats.byCategory["javascript"]).toBe(2);
        expect(stats.byCategory["python"]).toBe(1);
    });
});

describe("formatFileSize", () => {
    it("formats 0 bytes", () => {
        expect(formatFileSize(0)).toBe("0 B");
    });
    it("formats bytes", () => {
        expect(formatFileSize(500)).toBe("500.0 B");
    });
    it("formats kilobytes", () => {
        expect(formatFileSize(1024)).toBe("1.0 KB");
        expect(formatFileSize(2048)).toBe("2.0 KB");
    });
    it("formats megabytes", () => {
        expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });
    it("formats gigabytes", () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    });
});
