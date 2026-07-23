import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig } from "prisma/config"

const envPath = resolve(process.cwd(), ".env")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match || match[1].startsWith("#") || process.env[match[1]]) continue

    process.env[match[1]] = (match[2] ?? "").replace(/^['"]|['"]$/g, "").trim()
  }
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()

function parseDatabaseUrl(value: string, label: string) {
  try {
    return new URL(value)
  } catch {
    throw new Error(`${label} must be a valid URL`)
  }
}

function validatedTestDatabaseUrl(value: string) {
  const parsed = parseDatabaseUrl(value, "TEST_DATABASE_URL")
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
  const hostname = parsed.hostname.toLowerCase()
  const target = (url: URL) =>
    `${url.hostname.toLowerCase()}:${url.port || "5432"}${decodeURIComponent(url.pathname)}`

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("TEST_DATABASE_URL must use the PostgreSQL protocol")
  }
  if (!/(^|[-_])(ci|test)([-_]|$)/i.test(databaseName)) {
    throw new Error(
      "TEST_DATABASE_URL must point to an isolated database whose name contains test or ci"
    )
  }
  if (
    /(^|[-_.])(prod|production)([-_.]|$)/i.test(databaseName) ||
    /(^|[-_.])(prod|production)([-_.]|$)/i.test(hostname) ||
    /(?:^|\.)(?:aivencloud\.com|render\.com)$/i.test(hostname)
  ) {
    throw new Error("TEST_DATABASE_URL must not point to a production target")
  }
  if (
    !new Set(["localhost", "127.0.0.1", "::1"]).has(hostname) &&
    process.env.ALLOW_REMOTE_TEST_DATABASE !== "true"
  ) {
    throw new Error(
      "Remote TEST_DATABASE_URL targets require ALLOW_REMOTE_TEST_DATABASE=true"
    )
  }
  if (
    process.env.DATABASE_URL &&
    target(parseDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL")) ===
      target(parsed)
  ) {
    throw new Error("TEST_DATABASE_URL must be isolated from DATABASE_URL")
  }

  return value
}

const datasourceUrl = testDatabaseUrl
  ? validatedTestDatabaseUrl(testDatabaseUrl)
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
