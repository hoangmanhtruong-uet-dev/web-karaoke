import { describe, expect, it } from "vitest"

import {
  ABSOLUTE_SESSION_MS,
  advanceSessionToken,
  IDLE_SESSION_MS,
  type SessionSecurityToken,
} from "@/lib/session-policy"

const user = {
  id: "admin-1",
  role: "admin" as const,
  sessionVersion: 7,
}

function authenticatedToken(overrides: Partial<SessionSecurityToken> = {}) {
  return {
    id: user.id,
    role: user.role,
    sessionVersion: user.sessionVersion,
    absoluteExpiresAt: ABSOLUTE_SESSION_MS,
    lastActivityAt: 0,
    ...overrides,
  }
}

describe("session timeout policy", () => {
  it("sets idle and absolute timestamps after login", () => {
    const now = 10_000
    const token = advanceSessionToken({}, user, now)

    expect(token).toEqual({
      id: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
      twoFactorVerified: false,
      requiresTwoFactorSetup: false,
      absoluteExpiresAt: now + ABSOLUTE_SESSION_MS,
      lastActivityAt: now,
    })
  })

  it("refreshes activity without extending the absolute deadline", () => {
    const token = authenticatedToken({
      absoluteExpiresAt: ABSOLUTE_SESSION_MS + 5_000,
    })

    advanceSessionToken(token, undefined, IDLE_SESSION_MS - 1)

    expect(token.lastActivityAt).toBe(IDLE_SESSION_MS - 1)
    expect(token.absoluteExpiresAt).toBe(ABSOLUTE_SESSION_MS + 5_000)
    expect(token.id).toBe(user.id)
  })

  it("invalidates the token at the exact idle timeout", () => {
    const token = authenticatedToken()

    advanceSessionToken(token, undefined, IDLE_SESSION_MS)

    expect(token.id).toBeUndefined()
    expect(token.role).toBeUndefined()
    expect(token.sessionVersion).toBeUndefined()
  })

  it("invalidates the token at the exact absolute timeout", () => {
    const token = authenticatedToken({
      absoluteExpiresAt: IDLE_SESSION_MS - 1,
      lastActivityAt: IDLE_SESSION_MS - 2,
    })

    advanceSessionToken(token, undefined, IDLE_SESSION_MS - 1)

    expect(token.id).toBeUndefined()
    expect(token.role).toBeUndefined()
    expect(token.sessionVersion).toBeUndefined()
  })

  it("fails closed when a legacy token has no security timestamps", () => {
    const token = authenticatedToken({
      absoluteExpiresAt: undefined,
      lastActivityAt: undefined,
    })

    advanceSessionToken(token, undefined, 1)

    expect(token.id).toBeUndefined()
    expect(token.role).toBeUndefined()
    expect(token.sessionVersion).toBeUndefined()
  })
})
