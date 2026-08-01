import { assertSafeTestDatabase } from "./test-database-guard"
import { spawnNpmSync } from "./npm-process"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

loadLocalTestEnvironment()
enterTestEnvironment()
assertSafeTestDatabase()

const result = spawnNpmSync(
  ["exec", "--", "prisma", "migrate", "reset", "--force"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  }
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
