import { beforeEach, describe, expect, it, vi } from "vitest"

const getAdminPrincipal = vi.hoisted(() => vi.fn())
const findUnique = vi.hoisted(() => vi.fn())
const updateMany = vi.hoisted(() => vi.fn())
const createAudit = vi.hoisted(() => vi.fn())
const consumeRateLimit = vi.hoisted(() => vi.fn())
const clearRateLimit = vi.hoisted(() => vi.fn())
const rateLimitResponse = vi.hoisted(() =>
  vi.fn(() => new Response(null, { status: 429 }))
)
const compare = vi.hoisted(() => vi.fn())
const hash = vi.hoisted(() => vi.fn())
const writeSecurityAudit = vi.hoisted(() => vi.fn())

vi.mock("@/lib/admin-auth", () => ({ getAdminPrincipal }))
vi.mock("@/lib/prisma", () => ({
  default: {
    adminUser: { findUnique },
    $transaction: (operation: (tx: unknown) => Promise<unknown>) =>
      operation({
        adminUser: { updateMany },
        auditLog: { create: createAudit },
      }),
  },
}))
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit,
  clearRateLimit,
  rateLimitResponse,
}))
vi.mock("@/lib/request-context", () => ({
  hasTrustedProxyConfiguration: () => false,
  getClientIp: () => "unknown",
  requestContext: () => ({
    requestId: "request-1",
    ipAddressHash: null,
    userAgent: "vitest",
  }),
}))
vi.mock("@/lib/security-audit", () => ({ writeSecurityAudit }))
vi.mock("bcryptjs", () => ({ compare, hash }))

import { POST } from "@/app/api/admin/me/password/route"

const principal = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.test",
  role: "admin" as const,
  mustChangePassword: false,
}
const allowed = {
  allowed: true,
  retryAfterSeconds: 0,
  remaining: 4,
  newlyBlocked: false,
}

function request(body: unknown) {
  return new Request("https://karaoke.example.test/api/admin/me/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://karaoke.example.test",
      Host: "karaoke.example.test",
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/admin/me/password", () => {
  beforeEach(() => {
    getAdminPrincipal.mockReset()
    findUnique.mockReset()
    updateMany.mockReset()
    createAudit.mockReset()
    consumeRateLimit.mockReset()
    clearRateLimit.mockReset()
    rateLimitResponse.mockClear()
    compare.mockReset()
    hash.mockReset()
    writeSecurityAudit.mockReset()

    getAdminPrincipal.mockResolvedValue(principal)
    consumeRateLimit.mockResolvedValue(allowed)
    findUnique.mockResolvedValue({
      passwordHash: "old-hash",
      sessionVersion: 4,
    })
    updateMany.mockResolvedValue({ count: 1 })
    createAudit.mockResolvedValue({ id: "audit-1" })
    hash.mockResolvedValue("new-hash")
  })

  it("increments sessionVersion and revokes old sessions after a valid change", async () => {
    compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const response = await POST(
      request({
        currentPassword: "CurrentPassword!234",
        newPassword: "NewPassword!567",
      })
    )

    expect(response.status).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: principal.id,
          passwordHash: "old-hash",
          sessionVersion: 4,
        }),
        data: expect.objectContaining({
          passwordHash: "new-hash",
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
        }),
      })
    )
    expect(createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "auth.passwordChanged",
          result: "success",
        }),
      })
    )
    expect(await response.json()).toMatchObject({
      success: true,
      data: { changed: true, sessionsRevoked: true },
    })
  })

  it("rejects an invalid current password without writing", async () => {
    compare.mockResolvedValue(false)

    const response = await POST(
      request({
        currentPassword: "WrongPassword!234",
        newPassword: "NewPassword!567",
      })
    )

    expect(response.status).toBe(400)
    expect(updateMany).not.toHaveBeenCalled()
    expect(writeSecurityAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.passwordChangeFailed" })
    )
  })

  it("returns 429 and audits when the exact failure threshold is reached", async () => {
    consumeRateLimit.mockResolvedValue({
      ...allowed,
      remaining: 0,
      retryAfterSeconds: 900,
      newlyBlocked: true,
    })
    compare.mockResolvedValue(false)

    const response = await POST(
      request({
        currentPassword: "WrongPassword!234",
        newPassword: "NewPassword!567",
      })
    )

    expect(response.status).toBe(429)
    expect(writeSecurityAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.passwordChangeBlocked",
        result: "blocked",
      })
    )
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("fails safely when the account changes during password hashing", async () => {
    compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    updateMany.mockResolvedValue({ count: 0 })

    const response = await POST(
      request({
        currentPassword: "CurrentPassword!234",
        newPassword: "NewPassword!567",
      })
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "PASSWORD_CHANGE_CONFLICT" },
    })
  })
})
