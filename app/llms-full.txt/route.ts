import { buildLlmsFullTxt } from "../lib/agent-tools";

export const dynamic = "force-static";

export function GET() {
    return new Response(buildLlmsFullTxt(), {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
