import { assertSafeTestDatabase } from "./test-database-guard"
import { spawnNpmSync } from "./npm-process"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

function runNpmExec(args: string[]) {
  const result = spawnNpmSync(["exec", "--", ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

loadLocalTestEnvironment()
enterTestEnvironment()
assertSafeTestDatabase()

const suiteOnly = process.argv.includes("--suite-only")

if (!suiteOnly) {
  console.info("[integration] Validating the Prisma schema.")
  runNpmExec(["prisma", "validate"])
  console.info("[integration] Generating the Prisma client.")
  runNpmExec(["prisma", "generate"])
  console.info(
    "[integration] Applying checked-in migrations from the baseline."
  )
  runNpmExec(["prisma", "migrate", "deploy"])
}

console.info("[integration] Running isolated tests with fixture-owned cleanup.")
runNpmExec([
  "vitest",
  "run",
  "--config",
  "vitest.integration.config.ts",
  ...(process.env.CI ? ["--reporter=verbose"] : []),
])
