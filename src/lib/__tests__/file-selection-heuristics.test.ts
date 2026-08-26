import { describe, expect, it } from "vitest";
import { tryHeuristicFileSelection } from "@/lib/file-selection-heuristics";

describe("tryHeuristicFileSelection", () => {
    const fileTree = ["README.md", "package.json", "src/index.ts"];

    it("returns overview files for high-level repo questions", () => {
        const result = tryHeuristicFileSelection("What is this repo?", fileTree);
        expect(result).toEqual(["README.md", "package.json"]);
    });

    it("returns empty selection for follow-up summaries", () => {
        const result = tryHeuristicFileSelection("Summarize that", fileTree, [
            { role: "user", content: "Explain auth" },
            { role: "model", content: "Auth uses NextAuth." },
        ]);
        expect(result).toEqual([]);
    });

    it("returns null when heuristics do not apply", () => {
        const result = tryHeuristicFileSelection("How does token refresh work?", fileTree);
        expect(result).toBeNull();
    });
});
