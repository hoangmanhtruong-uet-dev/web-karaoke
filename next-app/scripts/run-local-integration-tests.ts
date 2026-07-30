import { spawnSync } from "node:child_process"

import { Pool } from "pg"

import { assertSafeTestDatabase } from "./test-database-guard"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

loadLocalTestEnvironment()
enterTestEnvironment()
const testDatabaseUrl = assertSafeTestDatabase()

const pool = new Pool({
  connectionString: testDatabaseUrl,
  max: 1,
  connectionTimeoutMillis: 3_000,
})

try {
  await pool.query("SELECT 1")
} catch {
  throw new Error(
    "Local PostgreSQL test database is not reachable. Start a local PostgreSQL instance or rely on the GitHub Actions integration job; Docker is optional and no remote fallback will be used."
  )
} finally {
  await pool.end()
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const result = spawnSync(npm, ["run", "test:integration"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: false,
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
