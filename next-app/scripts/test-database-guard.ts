import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

type Environment = NodeJS.ProcessEnv

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const FORBIDDEN_MANAGED_HOST = /(?:^|\.)(?:aivencloud\.com|render\.com)$/i

function readEnvFileValue(path: string, key: string) {
  if (!existsSync(path)) return undefined

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/)
    if (match?.[1] !== key) continue
    return (match[2] ?? "").replace(/^['"]|['"]$/g, "").trim()
  }

  return undefined
}

function parsePostgresUrl(value: string, label: string) {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL.`)
  }

  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    throw new Error(`${label} must use the PostgreSQL protocol.`)
  }
  return parsed
}

function databaseName(url: URL) {
  return decodeURIComponent(url.pathname.replace(/^\//, "")).split("/")[0]
}

function databaseTarget(url: URL) {
  return `${url.hostname.toLowerCase()}:${url.port || "5432"}/${databaseName(url).toLowerCase()}`
}

function configuredProductionHosts(env: Environment, cwd: string) {
  const raw =
    env.PRODUCTION_DATABASE_HOSTS ??
    readEnvFileValue(resolve(cwd, ".env"), "PRODUCTION_DATABASE_HOSTS") ??
    ""

  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

function matchesConfiguredHost(hostname: string, configuredHost: string) {
  return (
    hostname === configuredHost || hostname.endsWith(`.${configuredHost}`)
  )
}

export function assertSafeTestDatabase(
  env: Environment = process.env,
  cwd = process.cwd()
) {
  if (env.NODE_ENV !== "test") {
    throw new Error(
      'Integration tests require NODE_ENV="test". Use `npm run test:integration`.'
    )
  }

  const value = env.TEST_DATABASE_URL?.trim()
  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required. Create an isolated PostgreSQL database whose name ends with _test; no fallback database will be used."
    )
  }

  const testUrl = parsePostgresUrl(value, "TEST_DATABASE_URL")
  const name = databaseName(testUrl)
  const hostname = testUrl.hostname.toLowerCase()

  if (!name.toLowerCase().endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL database name must end with _test.")
  }
  if (
    /(^|[-_.])(prod|production)([-_.]|$)/i.test(name) ||
    /(^|[-_.])(prod|production)([-_.]|$)/i.test(hostname) ||
    FORBIDDEN_MANAGED_HOST.test(hostname)
  ) {
    throw new Error(
      "TEST_DATABASE_URL points to a forbidden production/managed target. Aiven and Render hosts are never accepted by this test runner."
    )
  }

  for (const productionHost of configuredProductionHosts(env, cwd)) {
    if (matchesConfiguredHost(hostname, productionHost)) {
      throw new Error(
        `TEST_DATABASE_URL hostname matches configured production host ${productionHost}.`
      )
    }
  }

  const configuredDatabaseUrls = [
    env.DATABASE_URL,
    readEnvFileValue(resolve(cwd, ".env"), "DATABASE_URL"),
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()))

  for (const configuredUrl of configuredDatabaseUrls) {
    const productionUrl = parsePostgresUrl(configuredUrl, "DATABASE_URL")
    if (databaseTarget(productionUrl) === databaseTarget(testUrl)) {
      throw new Error(
        "TEST_DATABASE_URL must not target the same host, port and database as DATABASE_URL."
      )
    }
  }

  if (!LOCAL_HOSTS.has(hostname) && env.ALLOW_REMOTE_TEST_DATABASE !== "true") {
    throw new Error(
      "Remote TEST_DATABASE_URL targets require ALLOW_REMOTE_TEST_DATABASE=true after the isolated target is reviewed."
    )
  }

  return value
}
