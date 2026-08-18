import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  { ignores: ["lib/**", "generated/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    plugins: { import: importPlugin },
    rules: {
      "import/no-unresolved": "off",
      quotes: ["error", "double"],
      indent: ["error", 2],
    },
  },
);
