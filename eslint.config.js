import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  { ignores: ["dist", "node_modules", ".npm-cache", "artifacts"] },
  js.configs.recommended,
  {
    files: ["scripts/*.mjs"],
    languageOptions: {
      globals: {
        document: "readonly",
        innerWidth: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
      },
    },
  },
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
);
