import { spawnSync } from "node:child_process"

import { assertSafeTestDatabase } from "./test-database-guard"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

loadLocalTestEnvironment()
enterTestEnvironment()
assertSafeTestDatabase()

const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const result = spawnSync(
  npm,
  ["exec", "--", "prisma", "migrate", "reset", "--force"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  }
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
