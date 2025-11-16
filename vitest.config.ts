import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/api/**/types.ts",
        "src/api/**/*Response.ts",
        "src/api/**/*Enums.ts",
      ],
    },
    testTimeout: 10000,
  },
});
