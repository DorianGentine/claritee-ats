import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "path";

// Config dédiée aux tests nécessitant une base de données (voir script `test:db`).
// Charge l'env comme prisma.config.ts : .env.local prioritaire, .env en fallback.
// En CI, ces fichiers sont absents (no-op) et DATABASE_URL est fourni par le job —
// dotenv n'écrase jamais une variable déjà définie.
//
// `test:unit` (config par défaut vitest.config.ts) reste volontairement SANS DB : les
// tests d'intégration se skippent (describe.runIf) tant que DATABASE_URL n'est pas défini.
// `pnpm test` enchaîne les deux : test:unit (config.ts) puis test:db (cette config).
config({ path: ".env.local" });
config();

export default defineConfig({
  test: {
    environment: "node",
    // Tests d'intégration en SÉRIE : ils partagent la même base Postgres et
    // interfèrent en parallèle (collisions de données). Déterminisme > vitesse ici.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
