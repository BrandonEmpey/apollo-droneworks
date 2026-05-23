import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import noStaleSelectDefault from "./eslint-rules/no-stale-select-default.js";

/**
 * ESLint flat config
 *
 * Run with:
 *   npx eslint client/src/
 *
 * The `local-rules/no-stale-select-default` rule catches the
 * `defaultValue={field.value}` anti-pattern that causes stale dropdowns in
 * react-hook-form <FormField> render props.  It is set to "error" so CI and
 * pre-commit hooks fail fast on any regression.
 */

export default [
  {
    files: ["client/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "local-rules": {
        rules: {
          "no-stale-select-default": noStaleSelectDefault,
        },
      },
    },
    rules: {
      /**
       * Block the `defaultValue={field.value}` anti-pattern inside
       * react-hook-form <FormField> render props.
       *
       * This rule has an auto-fixer: run `npx eslint --fix client/src/` to
       * automatically replace every `defaultValue` with `value`.
       */
      "local-rules/no-stale-select-default": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "public/**",
      "**/*.js",
      "scripts/**",
    ],
  },
];
