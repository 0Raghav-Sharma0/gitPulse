import { describe, expect, it } from "vitest";

import { mapProfileStreamChunk } from "@/lib/profile-stream";

describe("mapProfileStreamChunk", () => {
    it("maps STATUS chunks to status updates", () => {
        expect(mapProfileStreamChunk("STATUS:Loading profile")).toEqual({
            type: "status",
            message: "Loading profile",
            progress: 85,
        });
    });

    it("maps THOUGHT chunks to thought updates", () => {
        expect(mapProfileStreamChunk("THOUGHT:Reasoning step")).toEqual({
            type: "thought",
            text: "Reasoning step",
        });
    });

    it("maps non-prefixed chunks to content updates", () => {
        expect(mapProfileStreamChunk("Final answer chunk")).toEqual({
            type: "content",
            text: "Final answer chunk",
            append: true,
        });
    });
});
