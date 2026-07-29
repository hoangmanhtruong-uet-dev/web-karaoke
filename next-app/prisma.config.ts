import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig } from "prisma/config"

import { assertSafeTestDatabase } from "./scripts/test-database-guard"

const envPath = resolve(process.cwd(), ".env")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match || match[1].startsWith("#") || process.env[match[1]]) continue

    process.env[match[1]] = (match[2] ?? "").replace(/^['"]|['"]$/g, "").trim()
  }
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const datasourceUrl = testDatabaseUrl
  ? assertSafeTestDatabase(process.env, process.cwd())
  : process.env.DATABASE_URL

if (!datasourceUrl) {
  throw new Error("DATABASE_URL or TEST_DATABASE_URL is required")
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
})
