import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const TEST_ENV_KEYS = new Set(["TEST_DATABASE_URL", "TEST_POSTGRES_PORT"])

export function loadLocalTestEnvironment(cwd = process.cwd()) {
  const path = resolve(cwd, ".env.test.local")
  if (!existsSync(path)) return

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/)
    if (
      !match ||
      !TEST_ENV_KEYS.has(match[1]) ||
      process.env[match[1]] !== undefined
    )
      continue
    process.env[match[1]] = (match[2] ?? "").replace(/^['"]|['"]$/g, "").trim()
  }
}

export function enterTestEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to replace NODE_ENV=production for an integration database command."
    )
  }
  Object.assign(process.env, { NODE_ENV: "test" })
}
