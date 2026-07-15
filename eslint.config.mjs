import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "tmp/**",
    "app_setup/**",
    "DRO/**",
    "public/**",
    ".playwright-cli/**",
    // Local Finder-style conflict copies are preserved as user artifacts,
    // but are not part of the application entry graph.
    "**/* 2.tsx",
    "next-env.d.ts",
  ]),
  {
    files: ["scripts/disable-next-telemetry.cjs"],
    rules: {
      // This preloader patches Node's CommonJS module loader before Next starts.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
