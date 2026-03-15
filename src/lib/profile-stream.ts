import type { StreamUpdate } from "@/lib/streaming-types";

export function mapProfileStreamChunk(chunk: string): StreamUpdate {
    if (chunk.startsWith("STATUS:")) {
        return { type: "status", message: chunk.replace("STATUS:", "").trim(), progress: 85 };
    }

    if (chunk.startsWith("THOUGHT:")) {
        return { type: "thought", text: chunk.replace("THOUGHT:", "") };
    }

    return { type: "content", text: chunk, append: true };
}
