import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  compare: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  recoveryDeleteMany: vi.fn(),
  recoveryCreateMany: vi.fn(),
  auditCreate: vi.fn(),
  consumeRateLimit: vi.fn(),
  audit: vi.fn(),
  toDataURL: vi.fn(),
  verifyTotp: vi.fn(),
}))

vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("bcryptjs", () => ({ compare: mocks.compare }))
vi.mock("qrcode", () => ({ default: { toDataURL: mocks.toDataURL } }))
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
  createTotpEnrollment: () => ({
    secret: "BASE32SECRET",
    uri: "otpauth://test",
  }),
  encryptTotpSecret: () => "encrypted-pending-secret",
  generateRecoveryCodes: () => ["RK-ONE", "RK-TWO"],
  hashRecoveryCode: (code: string) => `hash:${code}`,
  verifyTotp: mocks.verifyTotp,
}))

import { POST } from "@/app/api/admin/me/2fa/setup/route"

function request(body: unknown) {
  return new Request("http://localhost/api/admin/me/2fa/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify(body),
  })
}

const session = {
  user: {
    id: "admin-1",
    role: "admin",
    sessionVersion: 4,
    twoFactorVerified: false,
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
  twoFactorEnabled: false,
  twoFactorSecret: null,
  twoFactorPendingSecret: null,
  twoFactorLastUsedStep: null,
}

const tx = {
  adminUser: { updateMany: mocks.updateMany },
  twoFactorRecoveryCode: {
    deleteMany: mocks.recoveryDeleteMany,
    createMany: mocks.recoveryCreateMany,
  },
  auditLog: { create: mocks.auditCreate },
}

describe("admin 2FA setup route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.auth.mockResolvedValue(session)
    mocks.findUnique.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(true)
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      newlyBlocked: false,
    })
    mocks.audit.mockResolvedValue(undefined)
    mocks.auditCreate.mockResolvedValue({})
    mocks.toDataURL.mockResolvedValue("data:image/png;base64,qr")
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.recoveryDeleteMany.mockResolvedValue({ count: 0 })
    mocks.recoveryCreateMany.mockResolvedValue({ count: 2 })
    mocks.transaction.mockImplementation(async (callback) => callback(tx))
  })

  it("allows a valid session to begin setup after password reauthentication", async () => {
    const response = await POST(
      request({ action: "begin", password: "StrongPassword9" })
    )

    expect(response.status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "admin-1",
        isActive: true,
        role: "admin",
        sessionVersion: 4,
        twoFactorEnabled: false,
      },
      data: { twoFactorPendingSecret: "encrypted-pending-secret" },
    })
    expect(await response.json()).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          qrDataUrl: "data:image/png;base64,qr",
          manualKey: "BASE32SECRET",
        }),
      })
    )
  })

  it("confirms setup atomically, stores hashed recovery codes, and revokes old sessions", async () => {
    mocks.findUnique.mockResolvedValue({
      ...user,
      twoFactorPendingSecret: "encrypted-pending-secret",
    })
    mocks.verifyTotp.mockResolvedValue({ valid: true, timeStep: 123 })

    const response = await POST(
      request({ action: "confirm", password: "StrongPassword9", otp: "123456" })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.sessionsRevoked).toBe(true)
    expect(body.data).not.toHaveProperty("manualKey")
    expect(body.data).not.toHaveProperty("twoFactorSecret")
    expect(mocks.recoveryCreateMany).toHaveBeenCalledWith({
      data: [
        { adminUserId: "admin-1", codeHash: "hash:RK-ONE" },
        { adminUserId: "admin-1", codeHash: "hash:RK-TWO" },
      ],
    })
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sessionVersion: 4 }),
        data: expect.objectContaining({
          twoFactorEnabled: true,
          sessionVersion: { increment: 1 },
          twoFactorLastUsedStep: 123,
        }),
      })
    )
    expect(mocks.transaction).toHaveBeenCalledOnce()
  })

  it.each([
    ["begin", { action: "begin", password: "StrongPassword9" }],
    [
      "confirm",
      { action: "confirm", password: "StrongPassword9", otp: "123456" },
    ],
  ])("rejects a revoked session before %s", async (_action, body) => {
    mocks.findUnique.mockResolvedValue({ ...user, sessionVersion: 5 })

    const response = await POST(request(body))

    expect(response.status).toBe(401)
    expect(mocks.compare).not.toHaveBeenCalled()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.revokedSessionRejected",
        result: "blocked",
      })
    )
  })

  it("rejects an inactive admin", async () => {
    mocks.findUnique.mockResolvedValue({ ...user, isActive: false })

    const response = await POST(
      request({ action: "begin", password: "StrongPassword9" })
    )

    expect(response.status).toBe(401)
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it("rejects a role without system management permission", async () => {
    mocks.findUnique.mockResolvedValue({ ...user, role: "staff" })

    const response = await POST(
      request({ action: "begin", password: "StrongPassword9" })
    )

    expect(response.status).toBe(403)
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it("rejects a wrong reauthentication password", async () => {
    mocks.compare.mockResolvedValue(false)

    const response = await POST(
      request({ action: "begin", password: "wrong-password" })
    )

    expect(response.status).toBe(403)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it("rejects an invalid OTP and records a failure without returning the secret", async () => {
    mocks.findUnique.mockResolvedValue({
      ...user,
      twoFactorPendingSecret: "encrypted-pending-secret",
    })
    mocks.verifyTotp.mockResolvedValue({ valid: false })

    const response = await POST(
      request({ action: "confirm", password: "StrongPassword9", otp: "000000" })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).not.toHaveProperty("data")
    expect(JSON.stringify(body)).not.toContain("encrypted-pending-secret")
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.2faSetupFailed",
        result: "failure",
      })
    )
  })

  it("records a blocked security event when repeated invalid OTP attempts reach the limit", async () => {
    mocks.findUnique.mockResolvedValue({
      ...user,
      twoFactorPendingSecret: "encrypted-pending-secret",
    })
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 900,
      remaining: 0,
      newlyBlocked: true,
    })
    mocks.verifyTotp.mockResolvedValue({ valid: false })

    const response = await POST(
      request({ action: "confirm", password: "StrongPassword9", otp: "000000" })
    )

    expect(response.status).toBe(400)
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.2faSetupBlocked",
        result: "blocked",
      })
    )
  })
  it("rejects the old session immediately after enabling 2FA", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({
        ...user,
        twoFactorPendingSecret: "encrypted-pending-secret",
      })
      .mockResolvedValueOnce({
        ...user,
        sessionVersion: 5,
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted-pending-secret",
      })
    mocks.verifyTotp.mockResolvedValue({ valid: true, timeStep: 123 })

    expect(
      (
        await POST(
          request({
            action: "confirm",
            password: "StrongPassword9",
            otp: "123456",
          })
        )
      ).status
    ).toBe(200)
    expect(
      (await POST(request({ action: "begin", password: "StrongPassword9" })))
        .status
    ).toBe(401)
  })
})
