import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // рендер дизайнов на холодную сборку при полном прогоне иногда дольше 5 с
    testTimeout: 15000,
  },
});
