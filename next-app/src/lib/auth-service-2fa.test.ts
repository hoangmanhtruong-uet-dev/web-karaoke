import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  recoveryUpdateMany: vi.fn(),
  consumeRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  audit: vi.fn(),
  verifyTotp: vi.fn(),
}))

vi.mock("bcryptjs", () => ({ compare: mocks.compare }))
vi.mock("@/lib/prisma", () => ({
  default: {
    adminUser: {
      findUnique: mocks.findUnique,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
    twoFactorRecoveryCode: { updateMany: mocks.recoveryUpdateMany },
  },
}))
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  clearRateLimit: mocks.clearRateLimit,
}))
vi.mock("@/lib/security-audit", () => ({ writeSecurityAudit: mocks.audit }))
vi.mock("@/lib/two-factor", () => ({
  verifyTotp: mocks.verifyTotp,
  hashRecoveryCode: (value: string) => `hash:${value}`,
}))

import { authenticateAdmin } from "@/lib/auth-service"

const credentials = {
  email: "admin@example.com",
  password: "StrongPassword9",
}
const user = {
  id: "a1",
  email: "admin@example.com",
  name: "Admin",
  passwordHash: "hash",
  role: "admin",
  isActive: true,
  sessionVersion: 3,
  twoFactorEnabled: true,
  twoFactorSecret: "encrypted",
  twoFactorLastUsedStep: 10,
  twoFactorConfirmedAt: new Date(),
}

describe("admin two-factor login", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.findUnique.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(true)
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      newlyBlocked: false,
    })
    mocks.clearRateLimit.mockResolvedValue(undefined)
    mocks.audit.mockResolvedValue(undefined)
    mocks.update.mockResolvedValue({})
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.recoveryUpdateMany.mockResolvedValue({ count: 0 })
    mocks.verifyTotp.mockResolvedValue({ valid: false })
  })

  it("does not issue a full session without the second factor", async () => {
    await expect(authenticateAdmin(credentials)).resolves.toBeNull()
  })

  it("accepts TOTP once and stores its time step to prevent replay", async () => {
    mocks.verifyTotp.mockResolvedValue({ valid: true, timeStep: 11 })
    await expect(
      authenticateAdmin({ ...credentials, otp: "123456" })
    ).resolves.toEqual(
      expect.objectContaining({
        id: user.id,
        twoFactorVerified: true,
        requiresTwoFactorSetup: false,
      })
    )
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { twoFactorLastUsedStep: 11 } })
    )
  })

  it("rejects a wrong or expired TOTP", async () => {
    await expect(
      authenticateAdmin({ ...credentials, otp: "000000" })
    ).resolves.toBeNull()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.2faFailed", result: "failure" })
    )
  })

  it("consumes a recovery code exactly once", async () => {
    mocks.recoveryUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
    const input = {
      ...credentials,
      recoveryCode: "RK-AAAA-BBBB-CCCC-DDDD",
    }
    await expect(authenticateAdmin(input)).resolves.toEqual(
      expect.objectContaining({ twoFactorVerified: true })
    )
    await expect(authenticateAdmin(input)).resolves.toBeNull()
  })
})
