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
    // Каждый процесс сам компилирует все дизайны «на холодную»; при процессе на каждое ядро они делят CPU
    // и первый рендер в файле ждёт 15–20 с. Половина ядер — без очереди и без ложных таймаутов.
    maxWorkers: "50%",
    // рендер дизайнов на холодную сборку при полном прогоне иногда дольше 5 с
    testTimeout: 15000,
  },
});
