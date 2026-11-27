/** API catalog (RFC 9727): lets agents discover the site's machine-facing endpoints. */
const SITE_URL = "https://junhoo.me";

export const dynamic = "force-static";

const linkset = {
    linkset: [
        {
            anchor: `${SITE_URL}/mcp`,
            "service-desc": [{ href: `${SITE_URL}/.well-known/mcp/server-card.json`, type: "application/json" }],
            "service-doc": [{ href: `${SITE_URL}/llms.txt`, type: "text/markdown" }],
        },
    ],
};

export function GET() {
    return new Response(JSON.stringify(linkset, null, 2), {
        headers: {
            "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
            "Access-Control-Allow-Origin": "*",
        },
    });
}

export function HEAD() {
    return new Response(null, {
        headers: { Link: `<${SITE_URL}/.well-known/api-catalog>; rel="api-catalog"` },
    });
}
