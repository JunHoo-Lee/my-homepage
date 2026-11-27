/**
 * Remote MCP server (Streamable HTTP transport, stateless, JSON responses).
 * Connect any MCP client to https://junhoo.me/mcp.
 * Spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */
import { AGENT_TOOLS, buildLlmsFullTxt, buildLlmsTxt, callAgentTool, SITE_URL } from "../lib/agent-tools";

const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = {
    name: "junhoo-me",
    title: "Junhoo Lee — homepage",
    version: "1.0.0",
    websiteUrl: SITE_URL,
};

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const RESOURCES = [
    { uri: `${SITE_URL}/llms.txt`, name: "llms.txt", title: "Site summary for LLMs", mimeType: "text/markdown", read: buildLlmsTxt },
    { uri: `${SITE_URL}/llms-full.txt`, name: "llms-full.txt", title: "Full site content for LLMs", mimeType: "text/markdown", read: buildLlmsFullTxt },
];

const ok = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function handle(req: RpcRequest) {
    const { id, method, params = {} } = req;
    switch (method) {
        case "initialize": {
            const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
            return ok(id, {
                protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
                capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
                serverInfo: SERVER_INFO,
                instructions:
                    "Read-only information about Junhoo Lee, an ML researcher: profile, publications (with BibTeX), news, awards and site pages. Start with get_profile or search_publications.",
            });
        }
        case "ping":
            return ok(id, {});
        case "tools/list":
            return ok(id, {
                tools: AGENT_TOOLS.map((t) => ({
                    name: t.name,
                    title: t.title,
                    description: t.description,
                    inputSchema: t.inputSchema,
                    annotations: { title: t.title, readOnlyHint: t.readOnly, openWorldHint: false },
                })),
            });
        case "tools/call": {
            const name = typeof params.name === "string" ? params.name : "";
            if (!AGENT_TOOLS.some((t) => t.name === name)) return fail(id, -32602, `Unknown tool: ${name}`);
            try {
                const result = callAgentTool(name, (params.arguments as Record<string, unknown>) ?? {});
                const isError = typeof result === "object" && result !== null && "error" in result;
                return ok(id, {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                    ...(Array.isArray(result) ? {} : { structuredContent: result }),
                    isError,
                });
            } catch (error) {
                return ok(id, { content: [{ type: "text", text: String(error) }], isError: true });
            }
        }
        case "resources/list":
            return ok(id, { resources: RESOURCES.map(({ uri, name, title, mimeType }) => ({ uri, name, title, mimeType })) });
        case "resources/read": {
            const resource = RESOURCES.find((r) => r.uri === params.uri);
            if (!resource) return fail(id, -32002, `Resource not found: ${String(params.uri)}`);
            return ok(id, { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.read() }] });
        }
        case "prompts/list":
            return ok(id, { prompts: [] });
        default:
            return fail(id, -32601, `Method not found: ${method}`);
    }
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json(fail(null, -32700, "Parse error"), { status: 400, headers: CORS });
    }

    const messages = (Array.isArray(body) ? body : [body]) as RpcRequest[];
    if (messages.length === 0 || messages.some((m) => !m || typeof m.method !== "string")) {
        // Responses or malformed input from the client: nothing to answer.
        const allResponses = messages.length > 0 && messages.every((m) => m && ("result" in m || "error" in m));
        return allResponses
            ? new Response(null, { status: 202, headers: CORS })
            : Response.json(fail(null, -32600, "Invalid Request"), { status: 400, headers: CORS });
    }

    // Notifications (no id) get no response.
    const replies = messages.filter((m) => m.id !== undefined && m.id !== null).map(handle);
    if (replies.length === 0) return new Response(null, { status: 202, headers: CORS });

    return Response.json(Array.isArray(body) ? replies : replies[0], { headers: CORS });
}

// Stateless server: no server-initiated SSE stream and no sessions to end.
export function GET() {
    return new Response("This is an MCP endpoint (Streamable HTTP). POST JSON-RPC messages here.", {
        status: 405,
        headers: { ...CORS, Allow: "POST, OPTIONS" },
    });
}

export function DELETE() {
    return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}
