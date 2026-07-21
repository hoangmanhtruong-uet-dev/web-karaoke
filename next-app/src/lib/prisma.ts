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
  const requiresTls = url.searchParams.get("sslmode") === "require"

  if (requiresTls) {
    // pg 8 currently interprets sslmode=require as certificate verification.
    // Aiven's managed endpoint uses a CA that is not in Node's default trust
    // store, so preserve encrypted transport without requiring that local CA.
    url.searchParams.delete("sslmode")
  }

  return {
    connectionString: url.toString(),
    ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
  }
}

const pool =
  globalForPool.pgPool ??
  new Pool(postgresConnectionOptions())

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
