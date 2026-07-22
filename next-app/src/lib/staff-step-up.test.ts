import { beforeEach, describe, expect, it, vi } from "vitest"

const consumeRateLimit = vi.hoisted(() => vi.fn())
const clearRateLimit = vi.hoisted(() => vi.fn())
const rateLimitResponse = vi.hoisted(() =>
  vi.fn(() => new Response(null, { status: 429 }))
)
const writeSecurityAudit = vi.hoisted(() => vi.fn())

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit,
  clearRateLimit,
  rateLimitResponse,
}))
vi.mock("@/lib/security-audit", () => ({ writeSecurityAudit }))

import {
  handleStaffStepUpFailure,
  releaseStaffStepUp,
  reserveStaffStepUp,
} from "@/lib/staff-step-up"

const actor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.test",
  role: "admin" as const,
  mustChangePassword: false,
}
const request = new Request("https://karaoke.example.test/api/admin/staff", {
  method: "POST",
})

describe("staff step-up rate limiting", () => {
  beforeEach(() => {
    consumeRateLimit.mockReset()
    clearRateLimit.mockReset()
    rateLimitResponse.mockClear()
    writeSecurityAudit.mockReset()
  })

  it("reserves a shared attempt before a privileged operation", async () => {
    consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      newlyBlocked: false,
    })

    const result = await reserveStaffStepUp(actor.id)

    expect("reservation" in result).toBe(true)
    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "staff-step-up-account",
        identifier: actor.id,
        limit: 5,
      })
    )
  })

  it("returns 429 without entering the privileged service when blocked", async () => {
    consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 900,
      remaining: 0,
      newlyBlocked: false,
    })

    const result = await reserveStaffStepUp(actor.id)

    if (!result.response) throw new Error("Expected a blocked response")

    expect(result.response.status).toBe(429)
  })

  it("audits the exact threshold and preserves the block after bad reauthentication", async () => {
    const reservation = {
      rule: {
        scope: "staff-step-up-account",
        identifier: actor.id,
        limit: 5,
        windowMs: 900_000,
        blockMs: 900_000,
      },
      decision: {
        allowed: true,
        retryAfterSeconds: 900,
        remaining: 0,
        newlyBlocked: true,
      },
    }

    const response = await handleStaffStepUpFailure(
      reservation,
      actor,
      request,
      "staff-2",
      "REAUTHENTICATION_REQUIRED"
    )

    expect(response?.status).toBe(429)
    expect(clearRateLimit).not.toHaveBeenCalled()
    expect(writeSecurityAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "staff.stepUpBlocked",
        result: "blocked",
      })
    )
  })

  it("releases a reserved attempt after success or non-credential errors", async () => {
    const reservation = {
      rule: {
        scope: "staff-step-up-account",
        identifier: actor.id,
        limit: 5,
        windowMs: 900_000,
        blockMs: 900_000,
      },
      decision: {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: 4,
        newlyBlocked: false,
      },
    }

    await releaseStaffStepUp(reservation)
    await handleStaffStepUpFailure(
      reservation,
      actor,
      request,
      "staff-2",
      "STAFF_NOT_FOUND"
    )

    expect(clearRateLimit).toHaveBeenCalledTimes(2)
  })
})
