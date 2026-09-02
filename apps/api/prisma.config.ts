import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

for (const envPath of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../.env"),
  resolve(process.cwd(), "../../.env"),
]) {
  loadEnv({ path: envPath, override: false, quiet: true });
}

const fallbackUrl = "postgresql://postgres:postgres@localhost:5432/stockline";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackUrl,
  },
});
