import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    // the WPLM page was first published as /wp-llm (2026-11-06)
    return [
      { source: "/wp-llm", destination: "/wplm", permanent: true },
      { source: "/wp-llm/:path*", destination: "/wplm/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return ["acro", "dsf", "backdoor", "mysteryofunlearnedparameters", "wplm"].map(slug => ({ source: `/${slug}`, destination: `/${slug}/index.html` }));
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
