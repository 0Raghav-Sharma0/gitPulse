import { describe, expect, it } from "vitest";

import { buildCopyPayload } from "@/lib/chat-message-actions";

describe("buildCopyPayload", () => {
    it("preserves mermaid markdown blocks for copy", () => {
        const content = "```mermaid\nflowchart TD\nA-->B\n```";
        const payload = buildCopyPayload(content);

        expect(payload.markdown).toContain("```mermaid");
        expect(payload.markdown).not.toContain("data:image/svg+xml");
    });
});
