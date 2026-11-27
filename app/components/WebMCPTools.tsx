"use client";

/**
 * WebMCP: registers the site's read-only tools with the browser's
 * navigator.modelContext so an in-browser agent can call them instead of
 * scraping the DOM. Does nothing in browsers without WebMCP.
 * Spec: https://webmachinelearning.github.io/webmcp/
 */
import { useEffect } from "react";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

type WebMCPTool = {
    name: string;
    title?: string;
    description: string;
    inputSchema: object;
    annotations?: { readOnlyHint?: boolean };
    execute: (args: Record<string, unknown>) => Promise<ToolResult>;
};

type ModelContext = {
    registerTool?: (tool: WebMCPTool, options?: { signal?: AbortSignal }) => { unregister?: () => void } | void;
    unregisterTool?: (name: string) => void;
    provideContext?: (context: { tools: WebMCPTool[] }) => void;
    clearContext?: () => void;
};

const text = (value: unknown, isError = false): ToolResult => ({
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
    ...(isError ? { isError } : {}),
});

export default function WebMCPTools() {
    useEffect(() => {
        const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
        if (!mc) return;

        const controller = new AbortController();
        const cleanups: (() => void)[] = [];
        let cancelled = false;

        // Loaded only when WebMCP exists, so other visitors don't download the data.
        import("../lib/agent-tools").then(({ AGENT_TOOLS, SITE_PAGES }) => {
            if (cancelled) return;

            const tools: WebMCPTool[] = AGENT_TOOLS.map((tool) => ({
                name: tool.name,
                title: tool.title,
                description: tool.description,
                inputSchema: tool.inputSchema,
                annotations: { readOnlyHint: tool.readOnly },
                execute: async (args) => {
                    try {
                        return text(tool.run(args ?? {}));
                    } catch (error) {
                        return text(String(error), true);
                    }
                },
            }));

            tools.push({
                name: "open_page",
                title: "Open a page on this site",
                description:
                    "Navigate the current tab to a page on this site. Pass a path from list_pages (e.g. \"/template-infilling\"), optionally with a #section anchor.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: `Site path. Known pages: ${SITE_PAGES.map((p) => p.path).join(", ")}`,
                        },
                    },
                    required: ["path"],
                    additionalProperties: false,
                },
                annotations: { readOnlyHint: false },
                execute: async ({ path }) => {
                    const target = typeof path === "string" ? path.trim() : "";
                    if (!target.startsWith("/") || target.startsWith("//")) {
                        return text("path must be a site-relative path starting with \"/\".", true);
                    }
                    window.setTimeout(() => window.location.assign(target), 0);
                    return text(`Navigating to ${new URL(target, window.location.origin).href}`);
                },
            });

            if (mc.registerTool) {
                for (const tool of tools) {
                    try {
                        const handle = mc.registerTool(tool, { signal: controller.signal });
                        cleanups.push(() => {
                            if (handle && typeof handle.unregister === "function") handle.unregister();
                            else mc.unregisterTool?.(tool.name);
                        });
                    } catch {
                        // already registered (e.g. React strict-mode double mount) — ignore
                    }
                }
            } else if (mc.provideContext) {
                mc.provideContext({ tools });
                cleanups.push(() => mc.clearContext?.());
            }
        }).catch(() => {});

        return () => {
            cancelled = true;
            controller.abort();
            for (const cleanup of cleanups) {
                try {
                    cleanup();
                } catch {
                    // tool may already be gone after abort
                }
            }
        };
    }, []);

    return null;
}
