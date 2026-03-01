import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Ignore generated/vendor folders
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/supabase/**",
      "**/tsconfig.tsbuildinfo",
      "eslint-print.json",
      "eslint.config.mjs.disabled",
      ".eslintrc.js.disabled",
    ],
  },

  js.configs.recommended,

  // TypeScript + TSX support
  ...tseslint.configs.recommended,

  // Project-specific tweaks
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
