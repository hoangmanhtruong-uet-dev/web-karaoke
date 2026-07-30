import { spawnSync } from "node:child_process"

import { assertSafeTestDatabase } from "./test-database-guard"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

const action = process.argv[2]
const composeArgs = [
  "compose",
  "-p",
  "web-karaoke-test",
  "-f",
  "docker-compose.test.yml",
]

function run(command: string, args: string[], quiet = false) {
  const executable =
    process.platform === "win32" && command === "npm" ? "npm.cmd" : command
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: quiet ? "ignore" : "inherit",
    shell: false,
  })
  if (result.error) {
    if (
      command === "docker" &&
      "code" in result.error &&
      result.error.code === "ENOENT"
    ) {
      throw new Error(
        "Docker CLI with Compose v2 is required only for the optional test:db:* Docker commands."
      )
    }
    throw result.error
  }
  return result.status ?? 1
}

function runRequired(command: string, args: string[]) {
  const status = run(command, args)
  if (status !== 0) process.exit(status)
}

function guardComposeTarget() {
  const url = new URL(assertSafeTestDatabase())
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  const port = url.port || "5432"
  const expectedPort = process.env.TEST_POSTGRES_PORT?.trim() || "55432"
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (
    !new Set(["localhost", "127.0.0.1", "::1"]).has(host) ||
    port !== expectedPort ||
    name !== "web_karaoke_test"
  ) {
    throw new Error(
      `Local Docker commands require loopback:${expectedPort}/web_karaoke_test. Update TEST_DATABASE_URL and TEST_POSTGRES_PORT together.`
    )
  }
}

function up() {
  guardComposeTarget()
  runRequired("docker", [...composeArgs, "up", "-d", "postgres-test"])
}

function waitUntilHealthy() {
  guardComposeTarget()
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (
      run(
        "docker",
        [
          ...composeArgs,
          "exec",
          "-T",
          "postgres-test",
          "pg_isready",
          "-U",
          "web_karaoke_test",
          "-d",
          "web_karaoke_test",
        ],
        true
      ) === 0
    ) {
      console.info("[test-db] PostgreSQL is healthy.")
      return
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000)
  }
  throw new Error("Timed out after 60 seconds waiting for test PostgreSQL.")
}

function migrate() {
  assertSafeTestDatabase()
  runRequired("npm", ["exec", "--", "prisma", "validate"])
  runRequired("npm", ["exec", "--", "prisma", "generate"])
  runRequired("npm", ["exec", "--", "prisma", "migrate", "deploy"])
}

function down(removeVolumes = false) {
  guardComposeTarget()
  runRequired("docker", [
    ...composeArgs,
    "down",
    ...(removeVolumes ? ["--volumes"] : []),
    "--remove-orphans",
  ])
}

loadLocalTestEnvironment()
enterTestEnvironment()

switch (action) {
  case "up":
    up()
    break
  case "wait":
    waitUntilHealthy()
    break
  case "migrate":
    migrate()
    break
  case "reset":
    down(true)
    up()
    waitUntilHealthy()
    migrate()
    break
  case "down":
    down()
    break
  default:
    throw new Error("Expected one action: up, wait, migrate, reset, down.")
}
