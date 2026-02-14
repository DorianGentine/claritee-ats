import { config } from "dotenv";

config({ path: ".env.local" });
config(); // .env fallback

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
