import { buildLlmsTxt } from "../lib/agent-tools";

export const dynamic = "force-static";

export function GET() {
    return new Response(buildLlmsTxt(), {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
