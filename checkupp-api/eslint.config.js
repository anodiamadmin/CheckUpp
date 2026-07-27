const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".yarn/**",
      "prisma/migrations/**",
      "prisma/schema.prisma",
      "eslint.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
      "no-console": "off",
    },
  }
);
