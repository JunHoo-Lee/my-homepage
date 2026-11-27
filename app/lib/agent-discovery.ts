import { AGENT_TOOLS, SITE_URL } from "./agent-tools";

/** MCP Server Card (SEP-1649 draft), served at /.well-known/mcp/server-card.json and /.well-known/mcp.json. */
export function mcpServerCard() {
    return {
        $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
        version: "1.0",
        protocolVersion: "2025-11-25",
        serverInfo: { name: "junhoo-me", title: "Junhoo Lee — homepage", version: "1.0.0" },
        description:
            "Read-only tools about Junhoo Lee, an ML researcher at KAIST: profile, publications with BibTeX, news, awards and site pages.",
        documentationUrl: `${SITE_URL}/llms.txt`,
        transport: { type: "streamable-http", endpoint: `${SITE_URL}/mcp` },
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        authentication: { required: false },
        tools: AGENT_TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema })),
        resources: [`${SITE_URL}/llms.txt`, `${SITE_URL}/llms-full.txt`],
    };
}

export function cardResponse() {
    return Response.json(mcpServerCard(), {
        headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" },
    });
}
