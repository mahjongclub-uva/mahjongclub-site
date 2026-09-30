import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["apps-script/*.gs"],
    languageOptions: {
      sourceType: "script",
      globals: Object.fromEntries(
        [
          "PropertiesService",
          "LockService",
          "SpreadsheetApp",
          "Utilities",
          "CalendarApp",
          "CacheService",
          "ContentService",
          "ScriptApp",
          "console",
          "HtmlService",
          "fail",
          "normalize",
          "text",
          "deriveDisplay",
          "closeNames",
          "validateResult",
          "rosterLayout",
          "attendanceLayout",
          "pointsLayout",
          "meetingWindow",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "error",
      "no-unused-vars": ["error", { vars: "local", args: "after-used" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
