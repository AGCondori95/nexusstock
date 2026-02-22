import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  // Archivos a ignorar globalmente
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.js",
      "eslint.config.mjs",
    ],
  },
  // Configuración base JS recomendada
  eslint.configs.recommended,
  // Configuraciones TypeScript strict
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // Override para archivos TypeScript del backend
  {
    files: ["backend/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Forzar retornos explícitos en funciones — claridad en APIs
      "@typescript-eslint/explicit-function-return-type": "error",
      // Prohibir any explícito — usamos unknown en su lugar
      "@typescript-eslint/no-explicit-any": "error",
      // Forzar manejo de promesas — previene fire-and-forget accidentales
      "@typescript-eslint/no-floating-promises": "error",
      // Forzar uso de nullish coalescing sobre ||
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      // Advertir sobre variables no usadas (prefijo _ para ignorar)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {argsIgnorePattern: "^_", varsIgnorePattern: "^_"},
      ],
    },
  },
  // Prettier SIEMPRE al final — desactiva reglas que conflictúen
  prettierConfig,
);
