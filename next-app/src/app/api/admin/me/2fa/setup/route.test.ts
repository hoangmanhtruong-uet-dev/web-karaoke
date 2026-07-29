import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  compare: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  recoveryDeleteMany: vi.fn(),
  recoveryCreateMany: vi.fn(),
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
    adminUser: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    twoFactorRecoveryCode: {
      deleteMany: mocks.recoveryDeleteMany,
      createMany: mocks.recoveryCreateMany,
    },
    $transaction: mocks.transaction,
  },
}))
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  rateLimitResponse: vi.fn(),
}))
vi.mock("@/lib/security-audit", () => ({ writeSecurityAudit: mocks.audit }))
vi.mock("@/lib/two-factor", () => ({
  createTotpEnrollment: () => ({ secret: "BASE32SECRET", uri: "otpauth://test" }),
  encryptTotpSecret: () => "encrypted-pending-secret",
  generateRecoveryCodes: () => ["RK-ONE", "RK-TWO"],
  hashRecoveryCode: (code: string) => `hash:${code}`,
  verifyTotp: mocks.verifyTotp,
}))

import { POST } from "@/app/api/admin/me/2fa/setup/route"

function request(body: unknown) {
  return new Request("http://localhost/api/admin/me/2fa/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("admin 2FA setup route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.auth.mockResolvedValue({
      user: { id: "admin-1", role: "admin", sessionVersion: 4 },
    })
    mocks.compare.mockResolvedValue(true)
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      newlyBlocked: false,
    })
    mocks.audit.mockResolvedValue(undefined)
    mocks.toDataURL.mockResolvedValue("data:image/png;base64,qr")
    mocks.update.mockReturnValue({ operation: "admin-update" })
    mocks.recoveryDeleteMany.mockReturnValue({ operation: "delete-codes" })
    mocks.recoveryCreateMany.mockReturnValue({ operation: "create-codes" })
    mocks.transaction.mockResolvedValue([])
  })

  it("starts setup only after password reauthentication", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      isActive: true,
      passwordHash: "hash",
      twoFactorEnabled: false,
      twoFactorPendingSecret: null,
    })
    const response = await POST(request({ action: "begin", password: "StrongPassword9" }))
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { twoFactorPendingSecret: "encrypted-pending-secret" },
    })
    const body = await response.json()
    expect(body.data.qrDataUrl).toBe("data:image/png;base64,qr")
  })

  it("confirms setup, stores hashed recovery codes and revokes old sessions", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      isActive: true,
      passwordHash: "hash",
      twoFactorEnabled: false,
      twoFactorPendingSecret: "encrypted-pending-secret",
    })
    mocks.verifyTotp.mockResolvedValue({ valid: true, timeStep: 123 })
    const response = await POST(
      request({ action: "confirm", password: "StrongPassword9", otp: "123456" })
    )
    expect(response.status).toBe(200)
    expect(mocks.recoveryCreateMany).toHaveBeenCalledWith({
      data: [
        { adminUserId: "admin-1", codeHash: "hash:RK-ONE" },
        { adminUserId: "admin-1", codeHash: "hash:RK-TWO" },
      ],
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          twoFactorEnabled: true,
          sessionVersion: { increment: 1 },
          twoFactorLastUsedStep: 123,
        }),
      })
    )
    expect(mocks.transaction).toHaveBeenCalledOnce()
  })
})
