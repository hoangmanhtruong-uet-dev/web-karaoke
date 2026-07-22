import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  consumeRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  audit: vi.fn(),
}))

vi.mock("bcryptjs", () => ({ compare: mocks.compare }))
vi.mock("@/lib/prisma", () => ({
  default: {
    adminUser: { findUnique: mocks.findUnique, update: mocks.update },
  },
}))
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  clearRateLimit: mocks.clearRateLimit,
}))
vi.mock("@/lib/security-audit", () => ({ writeSecurityAudit: mocks.audit }))

import { authenticateAdmin, passwordSchema } from "@/lib/auth-service"

const credentials = { email: "ADMIN@example.com", password: "StrongPassword9" }
const allowed = {
  allowed: true,
  retryAfterSeconds: 0,
  remaining: 4,
  newlyBlocked: false,
}

describe("admin authentication", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.consumeRateLimit.mockResolvedValue(allowed)
    mocks.clearRateLimit.mockResolvedValue(undefined)
    mocks.audit.mockResolvedValue(undefined)
    mocks.update.mockResolvedValue({})
  })

  it("authenticates an active account without exposing its password hash", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "a1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hash",
      role: "admin",
      isActive: true,
      sessionVersion: 3,
    })
    mocks.compare.mockResolvedValue(true)
    await expect(authenticateAdmin(credentials)).resolves.toEqual({
      id: "a1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      sessionVersion: 3,
    })
    expect(mocks.clearRateLimit).toHaveBeenCalledOnce()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.loginSucceeded" })
    )
  })

  it("uses the same null result for missing, wrong-password and disabled accounts", async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.compare.mockResolvedValue(false)
    await expect(authenticateAdmin(credentials)).resolves.toBeNull()
    expect(mocks.compare).toHaveBeenCalledWith(
      credentials.password,
      expect.stringMatching(/^\$2b\$12\$/)
    )

    mocks.findUnique.mockResolvedValue({
      id: "a1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hash",
      role: "admin",
      isActive: false,
      sessionVersion: 1,
    })
    mocks.compare.mockResolvedValue(true)
    await expect(authenticateAdmin(credentials)).resolves.toBeNull()
  })

  it("reserves an attempt and blocks before password lookup when the bucket is exhausted", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 900,
      remaining: 0,
      newlyBlocked: false,
    })
    await expect(authenticateAdmin(credentials)).resolves.toBeNull()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it("records the lock event when a failed attempt reaches the exact threshold", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 900,
      remaining: 0,
      newlyBlocked: true,
    })
    mocks.findUnique.mockResolvedValue(null)
    mocks.compare.mockResolvedValue(false)
    await expect(authenticateAdmin(credentials)).resolves.toBeNull()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.loginLocked", result: "blocked" })
    )
  })

  it("enforces the production password baseline", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false)
    expect(passwordSchema.safeParse("alllowercasepassword9").success).toBe(
      false
    )
    expect(passwordSchema.safeParse("StrongPassword9").success).toBe(true)
    expect(passwordSchema.safeParse(`${"A".repeat(71)}a9`).success).toBe(false)
  })
})
