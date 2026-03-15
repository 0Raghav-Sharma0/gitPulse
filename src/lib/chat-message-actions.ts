import mermaid from "mermaid";

import { exportChatToMarkdownFile, type ExportMessage } from "@/lib/chat-export";
import { renderMarkdownToHtml } from "@/lib/clipboard-utils";
import { generateMermaidFromJSON } from "@/lib/diagram-utils";
import { initMermaid } from "@/lib/mermaid-init";

initMermaid();

export function buildCopyPayload(content: string): { markdown: string; html: string } {
    const markdown = content;
    const html = renderMarkdownToHtml(markdown);
    return { markdown, html };
}

async function writeClipboard(markdown: string, html: string): Promise<void> {
    if (!("ClipboardItem" in window) || !navigator.clipboard.write) {
        await navigator.clipboard.writeText(markdown);
        return;
    }

    try {
        const item = new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([markdown], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        return;
    } catch {
        // Fallback to markdown/plain clipboard item below.
    }

    try {
        const item = new ClipboardItem({
            "text/markdown": new Blob([markdown], { type: "text/markdown" }),
            "text/plain": new Blob([markdown], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
    } catch {
        await navigator.clipboard.writeText(markdown);
    }
}

export async function copyChatMessageContent(content: string): Promise<void> {
    const { markdown, html } = buildCopyPayload(content);
    await writeClipboard(markdown, html);
}

export async function exportChatMessages(options: {
    title: string;
    contextLabel: string;
    messages: ExportMessage[];
}): Promise<void> {
    await exportChatToMarkdownFile({
        title: options.title,
        contextLabel: options.contextLabel,
        messages: options.messages,
        renderMermaid: (code, id) => mermaid.render(id, code).then((out) => out.svg),
        convertMermaidJson: (json) => {
            try {
                return generateMermaidFromJSON(JSON.parse(json));
            } catch {
                return null;
            }
        },
    });
}
