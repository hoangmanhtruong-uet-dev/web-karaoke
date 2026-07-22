import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const globalForPool = globalThis as unknown as {
  pgPool: Pool | undefined
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

const pool = globalForPool.pgPool ?? new Pool(postgresConnectionOptions())

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPool.pgPool = pool
}

export default prisma
