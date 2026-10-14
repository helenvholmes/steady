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
    "next-env.d.ts",
    // The drawing generators run in their own folder with their own dependencies.
    "scripts/drawings/**",
    // Fancy Components code, copied as-is from fancycomponents.dev (see THIRD_PARTY_NOTICES.md).
    "src/components/fancy/**",
  ]),
]);

export default eslintConfig;
