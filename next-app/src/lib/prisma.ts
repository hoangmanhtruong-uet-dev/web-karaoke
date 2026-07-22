import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const globalForPool = globalThis as unknown as {
  pgPool: Pool | undefined
}

function integerSetting(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }
  return value
}


function postgresConnectionOptions() {
  const configuredUrl = process.env.DATABASE_URL
  if (!configuredUrl) return { connectionString: configuredUrl }

  const url = new URL(configuredUrl)
  const sslMode = url.searchParams.get("sslmode")
  const requiresTls = ["require", "verify-ca", "verify-full"].includes(
    sslMode ?? ""
  )

  if (process.env.NODE_ENV === "production" && !requiresTls) {
    throw new Error("Production DATABASE_URL must require verified TLS")
  }

  if (!requiresTls) return { connectionString: url.toString() }

  url.searchParams.delete("sslmode")
  const encodedCa = process.env.DATABASE_SSL_CA_BASE64?.trim()
  const ca = encodedCa
    ? Buffer.from(encodedCa, "base64").toString("utf8")
    : undefined
  const allowUnverified =
    process.env.NODE_ENV !== "production" &&
    process.env.DATABASE_SSL_ALLOW_UNVERIFIED === "true"

  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: !allowUnverified,
      ...(ca ? { ca } : {}),
    },
  }
}

const pool = globalForPool.pgPool ?? new Pool({
  ...postgresConnectionOptions(),
  max: integerSetting("DATABASE_POOL_MAX", 5, 50),
  connectionTimeoutMillis: integerSetting("DATABASE_CONNECT_TIMEOUT_MS", 3_000, 60_000),
  idleTimeoutMillis: integerSetting("DATABASE_IDLE_TIMEOUT_MS", 30_000, 600_000),
  query_timeout: integerSetting("DATABASE_QUERY_TIMEOUT_MS", 10_000, 120_000),
  statement_timeout: integerSetting("DATABASE_STATEMENT_TIMEOUT_MS", 10_000, 120_000),
  maxLifetimeSeconds: integerSetting("DATABASE_CONNECTION_LIFETIME_SECONDS", 300, 3_600),
  application_name: "web-karaoke",
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: integerSetting("DATABASE_TRANSACTION_MAX_WAIT_MS", 3_000, 60_000),
      timeout: integerSetting("DATABASE_TRANSACTION_TIMEOUT_MS", 10_000, 120_000),
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPool.pgPool = pool
}

export default prisma
