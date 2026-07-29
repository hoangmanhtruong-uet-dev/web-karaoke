import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"

import { assertSafeTestDatabase } from "./test-database-guard"

function loadTestEnvironment() {
  const path = resolve(process.cwd(), ".env.test.local")
  if (!existsSync(path)) return

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/)
    if (!match || process.env[match[1]] !== undefined) continue
    process.env[match[1]] = (match[2] ?? "")
      .replace(/^['"]|['"]$/g, "")
      .trim()
  }
}

function runNpmExec(args: string[]) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm"
  const result = spawnSync(npm, ["exec", "--", ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

loadTestEnvironment()
Object.assign(process.env, { NODE_ENV: "test" })
assertSafeTestDatabase()

console.info("[integration] Safety guard passed; applying checked-in migrations.")
runNpmExec(["prisma", "migrate", "deploy"])

console.info(
  "[integration] Running isolated tests; each suite seeds minimal fixtures and cleans only records it owns."
)
runNpmExec(["vitest", "run", "--config", "vitest.integration.config.ts"])
