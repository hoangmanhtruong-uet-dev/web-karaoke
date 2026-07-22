export const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000
export const IDLE_SESSION_MS = 30 * 60 * 1000

export type SessionRole = "user" | "staff" | "manager" | "admin"

export type SessionSecurityToken = {
  [key: string]: unknown
  id?: string
  role?: SessionRole
  sessionVersion?: number
  absoluteExpiresAt?: number
  lastActivityAt?: number
}

export type SessionSecurityUser = {
  id: string
  role: SessionRole
  sessionVersion: number
}

export function advanceSessionToken<T extends SessionSecurityToken>(
  token: T,
  user?: SessionSecurityUser,
  now = Date.now()
): T {
  if (user) {
    token.id = user.id
    token.role = user.role
    token.sessionVersion = user.sessionVersion
    token.absoluteExpiresAt = now + ABSOLUTE_SESSION_MS
    token.lastActivityAt = now
    return token
  }

  const expired =
    typeof token.absoluteExpiresAt !== "number" ||
    typeof token.lastActivityAt !== "number" ||
    now >= token.absoluteExpiresAt ||
    now - token.lastActivityAt >= IDLE_SESSION_MS

  if (expired) {
    delete token.id
    delete token.role
    delete token.sessionVersion
    return token
  }

  token.lastActivityAt = now
  return token
}
