import { defineConfig } from "prisma/config";

// DATABASE_URL is provided by Railway. The placeholder fallback only exists so that
// commands which never connect (prisma generate, prisma migrate diff) work without a database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
