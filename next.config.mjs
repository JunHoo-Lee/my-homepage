import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  async rewrites() {
    return ["acro", "dsf", "backdoor"].map(slug => ({ source: `/${slug}`, destination: `/${slug}/index.html` }));
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
