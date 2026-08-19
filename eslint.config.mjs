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
    // Build output and generated code. All three are already in .gitignore;
    // linting them buries real findings under thousands of results from code
    // nobody wrote and nobody can fix.
    ".open-next/**",
    "lib/generated/**",
    "scratchpad/**",
  ]),
]);

export default eslintConfig;
