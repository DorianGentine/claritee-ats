import { config } from "dotenv";

config({ path: ".env.local" });
config(); // .env fallback

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  experimental: {
    externalTables: true,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
    // Stub auth pour la shadow DB (Supabase fournit auth.uid() en prod)
    initShadowDb: `
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
        SELECT NULL::uuid;
      $$ LANGUAGE sql;
    `,
  },
  datasource: {
    // DIRECT_DATABASE_URL (port 5432) pour migrate dev/deploy
    // Fallback sur DATABASE_URL si non défini (ex: generate sans DB)
    url: process.env.DIRECT_DATABASE_URL ?? env("DATABASE_URL"),
  },
});
