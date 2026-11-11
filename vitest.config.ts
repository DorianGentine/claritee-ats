import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./__tests__/setup/react-dom.ts"],
    // Tests DB : uniquement via `bun run test:db` (vitest.config.db.ts).
    exclude: ["**/node_modules/**", "__tests__/db/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
