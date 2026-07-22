import { beforeEach, describe, expect, it, vi } from "vitest"

type Bucket = {
  keyHash: string
  scope: string
  count: number
  windowStartedAt: Date
  blockedUntil: Date | null
  updatedAt: Date
}

type UpsertArgs = {
  where: { keyHash: string }
  create: Omit<Bucket, "updatedAt">
  update: Partial<Omit<Bucket, "keyHash" | "updatedAt">>
}

const mocks = vi.hoisted(() => {
  const buckets = new Map<string, Bucket>()
  const findUnique = vi.fn(
    async ({ where }: { where: { keyHash: string } }) =>
      buckets.get(where.keyHash) ?? null
  )
  const upsert = vi.fn(async ({ where, create, update }: UpsertArgs) => {
    const current = buckets.get(where.keyHash)
    const next: Bucket = current
      ? { ...current, ...update, updatedAt: new Date() }
      : { ...create, updatedAt: new Date() }
    buckets.set(where.keyHash, next)
    return next
  })
  const deleteMany = vi.fn(async () => ({ count: 0 }))
  const executeRaw = vi.fn(async () => 0)
  const securityRateLimit = { findUnique, upsert, deleteMany }
  const transactionClient = { $executeRaw: executeRaw, securityRateLimit }
  const transaction = vi.fn(
    async (operation: (tx: typeof transactionClient) => Promise<unknown>) =>
      operation(transactionClient)
  )

  return {
    buckets,
    findUnique,
    upsert,
    deleteMany,
    executeRaw,
    transaction,
    securityRateLimit,
  }
})

vi.mock("@/lib/prisma", () => ({
  default: {
    securityRateLimit: mocks.securityRateLimit,
    $transaction: mocks.transaction,
  },
}))

import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit"

const rule = {
  scope: "login-account-ip",
  identifier: "employee@example.test:203.0.113.10",
  limit: 5,
  windowMs: 15 * 60_000,
  blockMs: 15 * 60_000,
}

describe("database rate limiter", () => {
  beforeEach(() => {
    mocks.buckets.clear()
    mocks.findUnique.mockClear()
    mocks.upsert.mockClear()
    mocks.deleteMany.mockClear()
    mocks.executeRaw.mockClear()
    mocks.transaction.mockClear()
  })

  it("sets a full block at the exact threshold even late in the fixed window", async () => {
    const startedAt = new Date("2026-07-22T00:00:00.000Z")
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const decision = await consumeRateLimit(rule, startedAt)
      expect(decision).toMatchObject({ allowed: true, newlyBlocked: false })
    }

    const fifthAt = new Date(startedAt.getTime() + 14 * 60_000)
    const fifth = await consumeRateLimit(rule, fifthAt)
    expect(fifth).toMatchObject({
      allowed: true,
      newlyBlocked: true,
      retryAfterSeconds: 900,
    })

    const sixth = await consumeRateLimit(
      rule,
      new Date(fifthAt.getTime() + 1_000)
    )
    expect(sixth).toMatchObject({ allowed: false, newlyBlocked: false })

    const afterOriginalWindow = await checkRateLimit(
      rule,
      new Date(startedAt.getTime() + 15 * 60_000)
    )
    expect(afterOriginalWindow.allowed).toBe(false)
    expect(afterOriginalWindow.retryAfterSeconds).toBe(14 * 60)

    const afterFullBlock = await checkRateLimit(
      rule,
      new Date(fifthAt.getTime() + 15 * 60_000 + 1)
    )
    expect(afterFullBlock.allowed).toBe(true)
  })

  it("does not create a global bucket when client IP is unresolved", async () => {
    const decision = await consumeRateLimit({ ...rule, identifier: "unknown" })

    expect(decision).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 5,
      newlyBlocked: false,
    })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
