import type { ChatMessageBase } from "@/lib/chat-types";

export type ExportMessage = Pick<ChatMessageBase, "role" | "content" | "relevantFiles">;

type MermaidRenderer = (code: string, id: string) => Promise<string>;
type MermaidJsonConverter = (json: string) => string | null;

// Keep filenames predictable and safe for most filesystems.
function sanitizeFilenameLabel(label: string): string {
    return label.replace(/[^a-z0-9._-]+/gi, "-");
}

// Timestamped export name based on the chat context.
function buildChatExportFilename(label: string, exportedAt: Date): string {
    const safeLabel = sanitizeFilenameLabel(label);
    const stamp = exportedAt.toISOString().replace(/[:.]/g, "-");
    return `${safeLabel}-chat-export-${stamp}.md`;
}

// Trigger a download in the browser without a server round-trip.
function downloadMarkdown(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

// End-to-end export: convert charts, build markdown, then download.
export async function exportChatToMarkdownFile(options: {
    title: string;
    contextLabel: string;
    messages: ExportMessage[];
    exportedAt?: Date;
    renderMermaid: MermaidRenderer;
    convertMermaidJson?: MermaidJsonConverter;
}): Promise<void> {
    const exportedAt = options.exportedAt ?? new Date();
    const exportedMessages = await Promise.all(
        options.messages.map(async (message) => ({
            ...message,
            content: await convertChartsToImages(message.content, {
                renderMermaid: options.renderMermaid,
                convertMermaidJson: options.convertMermaidJson,
            }),
        }))
    );
    const content = buildChatMarkdown({
        title: options.title,
        contextLabel: options.contextLabel,
        messages: exportedMessages,
        exportedAt,
    });
    const filename = buildChatExportFilename(options.contextLabel, exportedAt);
    downloadMarkdown(content, filename);
}

// Replace mermaid code blocks with embedded SVG images for markdown portability.
export async function convertChartsToImages(
    content: string,
    options: {
        renderMermaid: MermaidRenderer;
        convertMermaidJson?: MermaidJsonConverter;
    }
): Promise<string> {
    const pattern = /```(mermaid|mermaid-json)\n([\s\S]*?)```/g;
    let result = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = pattern.exec(content)) !== null) {
        const [block, language, code] = match;
        result += content.slice(lastIndex, match.index);
        lastIndex = match.index + block.length;

        let mermaidCode = code.trim();
        if (language === "mermaid-json") {
            if (options.convertMermaidJson) {
                const converted = options.convertMermaidJson(mermaidCode);
                if (converted) {
                    mermaidCode = converted;
                } else {
                    result += block;
                    continue;
                }
            } else {
                result += block;
                continue;
            }
        }

        try {
            const svg = await options.renderMermaid(mermaidCode, `export-${Date.now()}-${index}`);
            const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
            result += `![Mermaid chart ${index + 1}](${dataUri})`;
        } catch {
            result += block;
        }

        index += 1;
    }

    result += content.slice(lastIndex);
    return result;
}

// Construct a readable, structured transcript for export.
export function buildChatMarkdown(options: {
    title: string;
    contextLabel: string;
    messages: ExportMessage[];
    exportedAt?: Date;
}): string {
    const exportedAt = options.exportedAt ?? new Date();
    const lines: string[] = [];

    lines.push(`# ${options.title}`);
    lines.push("");
    lines.push(`- Context: ${options.contextLabel}`);
    lines.push(`- Exported: ${exportedAt.toISOString()}`);
    lines.push(`- Messages: ${options.messages.length}`);
    lines.push("");

    let userTurn = 0;
    let assistantTurn = 0;

    options.messages.forEach((message) => {
        if (message.role === "user") {
            userTurn += 1;
        } else {
            assistantTurn += 1;
        }
        lines.push("---");
        lines.push("");
        if (message.role === "user") {
            lines.push(`## User Query ${userTurn}`);
        } else {
            lines.push(`## AI Response ${assistantTurn}`);
        }
        lines.push("");
        lines.push(message.content.trim() || "_(empty message)_");
        lines.push("");

        if (message.relevantFiles && message.relevantFiles.length > 0) {
            lines.push("**Relevant files**");
            lines.push("");
            message.relevantFiles.forEach((file) => {
                lines.push(`- \`${file}\``);
            });
            lines.push("");
        }
    });

    return lines.join("\n");
}
