
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
import { ensureDatabaseEnv } from "./scripts/resolve-db-env.mjs";

config({ path: ".env.local" });
config();
ensureDatabaseEnv();

const prismaCliDatabaseUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (
  process.env.VERCEL &&
  !process.env.DIRECT_URL &&
  process.env.DATABASE_URL?.includes("-pooler")
) {
  console.warn(
    "[prisma] DIRECT_URL is missing on Vercel. Set Neon’s direct (non-pooler) URL as DIRECT_URL so migrations can run.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Avoid running migrations through pooled URLs; advisory locks require a direct connection.
    url: prismaCliDatabaseUrl ?? env("DATABASE_URL"),
  },
});
