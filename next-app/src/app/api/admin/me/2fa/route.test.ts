import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  compare: vi.fn(),
  findUnique: vi.fn(),
  adminUpdateMany: vi.fn(),
  recoveryUpdateMany: vi.fn(),
  recoveryDeleteMany: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  consumeRateLimit: vi.fn(),
  audit: vi.fn(),
  verifyTotp: vi.fn(),
  hashRecoveryCode: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("bcryptjs", () => ({ compare: mocks.compare }))
vi.mock("@/lib/prisma", () => ({
  default: {
    adminUser: { findUnique: mocks.findUnique },
    auditLog: { create: mocks.auditCreate },
    $transaction: mocks.transaction,
  },
}))
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  rateLimitResponse: vi.fn(),
}))
vi.mock("@/lib/security-audit", () => ({ writeSecurityAudit: mocks.audit }))
vi.mock("@/lib/two-factor", () => ({
  verifyTotp: mocks.verifyTotp,
  hashRecoveryCode: mocks.hashRecoveryCode,
}))
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError },
}))

import { DELETE } from "@/app/api/admin/me/2fa/route"

function request(body: unknown) {
  return new Request("http://localhost/api/admin/me/2fa", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify(body),
  })
}

const session = {
  user: {
    id: "admin-1",
    role: "admin",
    sessionVersion: 4,
    twoFactorVerified: true,
  },
}

const user = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
  isActive: true,
  mustChangePassword: false,
  assignedBranchId: null,
  sessionVersion: 4,
  passwordHash: "hash",
  twoFactorEnabled: true,
  twoFactorSecret: "encrypted-secret",
  twoFactorPendingSecret: null,
  twoFactorLastUsedStep: 100,
}

const tx = {
  adminUser: { updateMany: mocks.adminUpdateMany },
  twoFactorRecoveryCode: {
    updateMany: mocks.recoveryUpdateMany,
    deleteMany: mocks.recoveryDeleteMany,
  },
  auditLog: { create: mocks.auditCreate },
}

describe("admin 2FA disable route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.auth.mockResolvedValue(session)
    mocks.findUnique.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(true)
    mocks.verifyTotp.mockResolvedValue({ valid: true, timeStep: 101 })
    mocks.hashRecoveryCode.mockImplementation((code: string) => `hash:${code}`)
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      newlyBlocked: false,
    })
    mocks.adminUpdateMany.mockResolvedValue({ count: 1 })
    mocks.recoveryUpdateMany.mockResolvedValue({ count: 1 })
    mocks.recoveryDeleteMany.mockResolvedValue({ count: 1 })
    mocks.auditCreate.mockResolvedValue({})
    mocks.audit.mockResolvedValue(undefined)
    mocks.transaction.mockImplementation(async (callback) => callback(tx))
  })

  it("disables 2FA atomically and increments sessionVersion", async () => {
    const response = await DELETE(
      request({ password: "StrongPassword9", otp: "123456" })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(
      expect.objectContaining({
        data: { disabled: true, sessionsRevoked: true },
      })
    )
    expect(mocks.adminUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "admin-1",
        isActive: true,
        role: "admin",
        sessionVersion: 4,
        twoFactorEnabled: true,
      },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorPendingSecret: null,
        twoFactorConfirmedAt: null,
        twoFactorLastUsedStep: null,
        sessionVersion: { increment: 1 },
      },
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
  })

  it("rejects a revoked session before password or second-factor checks", async () => {
    mocks.findUnique.mockResolvedValue({ ...user, sessionVersion: 5 })

    const response = await DELETE(
      request({ password: "StrongPassword9", otp: "123456" })
    )

    expect(response.status).toBe(401)
    expect(mocks.compare).not.toHaveBeenCalled()
    expect(mocks.verifyTotp).not.toHaveBeenCalled()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.revokedSessionRejected" })
    )
  })

  it("requires the signed session to have completed the second factor", async () => {
    mocks.auth.mockResolvedValue({
      user: { ...session.user, twoFactorVerified: false },
    })

    const response = await DELETE(
      request({ password: "StrongPassword9", otp: "123456" })
    )

    expect(response.status).toBe(401)
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it("rejects a wrong OTP without changing 2FA state", async () => {
    mocks.verifyTotp.mockResolvedValue({ valid: false })

    const response = await DELETE(
      request({ password: "StrongPassword9", otp: "000000" })
    )

    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.2faDisableFailed" })
    )
  })

  it("consumes a recovery code only inside the disabling transaction and never logs or returns it", async () => {
    const recoveryCode = "RK-AAAA-BBBB-CCCC-DDDD"

    const response = await DELETE(
      request({ password: "StrongPassword9", recoveryCode })
    )
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.recoveryUpdateMany).toHaveBeenCalledWith({
      where: {
        adminUserId: "admin-1",
        codeHash: `hash:${recoveryCode}`,
        usedAt: null,
      },
      data: { usedAt: expect.any(Date) },
    })
    expect(JSON.stringify(responseBody)).not.toContain(recoveryCode)
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(recoveryCode)
    expect(JSON.stringify(mocks.auditCreate.mock.calls)).not.toContain(
      recoveryCode
    )
    expect(JSON.stringify(mocks.loggerError.mock.calls)).not.toContain(
      recoveryCode
    )
  })

  it("rejects the old session immediately after disabling 2FA", async () => {
    mocks.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce({
      ...user,
      sessionVersion: 5,
      twoFactorEnabled: false,
      twoFactorSecret: null,
    })

    expect(
      (await DELETE(request({ password: "StrongPassword9", otp: "123456" })))
        .status
    ).toBe(200)
    expect(
      (await DELETE(request({ password: "StrongPassword9", otp: "123456" })))
        .status
    ).toBe(401)
  })
})
