import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    // Prisma CLI (migrate, studio, db execute) needs a DIRECT,
    // non-pooled connection — this is why DIRECT_URL is used here,
    // not DATABASE_URL.
    url: env("DIRECT_URL"),
  },
});