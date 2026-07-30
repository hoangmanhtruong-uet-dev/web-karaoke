type Environment = NodeJS.ProcessEnv

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const FORBIDDEN_MANAGED_HOST = /(?:^|\.)(?:aivencloud\.com|render\.com)$/i

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
  let name: string
  try {
    name = decodeURIComponent(url.pathname.replace(/^\//, ""))
  } catch {
    throw new Error("TEST_DATABASE_URL database name is malformed.")
  }
  if (!name || name.includes("/")) {
    throw new Error(
      "TEST_DATABASE_URL must include one non-empty database name."
    )
  }
  return name
}

function normalizedHostname(url: URL) {
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return LOCAL_HOSTS.has(hostname) ? "loopback" : hostname
}

function databaseTarget(url: URL) {
  return `${normalizedHostname(url)}:${url.port || "5432"}/${databaseName(url).toLowerCase()}`
}

function configuredProductionTargets(env: Environment) {
  return (env.PRODUCTION_DATABASE_HOSTS ?? "")
    .split(",")
    .map((target) => target.trim().toLowerCase())
    .filter(Boolean)
}

function matchesConfiguredTarget(url: URL, configuredTarget: string) {
  const [configuredHost, configuredPort] = configuredTarget.split(":")
  const hostname = normalizedHostname(url)
  const port = url.port || "5432"
  return Boolean(
    configuredHost &&
    (hostname === configuredHost || hostname.endsWith(`.${configuredHost}`)) &&
    (!configuredPort || configuredPort === port)
  )
}

export function assertSafeTestDatabase(env: Environment = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Integration database operations are forbidden when NODE_ENV=production."
    )
  }
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
  const hostname = normalizedHostname(testUrl)

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

  for (const productionTarget of configuredProductionTargets(env)) {
    if (matchesConfiguredTarget(testUrl, productionTarget)) {
      throw new Error(
        "TEST_DATABASE_URL matches a configured production host/port."
      )
    }
  }

  if (env.DATABASE_URL?.trim()) {
    const productionUrl = parsePostgresUrl(env.DATABASE_URL, "DATABASE_URL")
    if (databaseTarget(productionUrl) === databaseTarget(testUrl)) {
      throw new Error(
        "TEST_DATABASE_URL must not target the same host, port and database as DATABASE_URL."
      )
    }
  }

  if (hostname !== "loopback") {
    throw new Error(
      "TEST_DATABASE_URL must target localhost, 127.0.0.1 or ::1. Remote test databases are not accepted."
    )
  }

  console.info(
    `[test-database-guard] target host=${hostname} port=${testUrl.port || "5432"} database=${name}`
  )
  return value
}
