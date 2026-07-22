import { createHash } from "node:crypto"

import { compare } from "bcryptjs"
import { z } from "zod"

import prisma from "@/lib/prisma"
import { loginPasswordSchema } from "@/lib/password-policy"
import {
  clearRateLimit,
  consumeRateLimit,
  type RateLimitRule,
} from "@/lib/rate-limit"
import { getClientIp, hashSecurityIdentifier } from "@/lib/request-context"
import { writeSecurityAudit } from "@/lib/security-audit"

export { passwordSchema } from "@/lib/password-policy"

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_BLOCK_MS = 15 * 60 * 1000
const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZTkHDJqDUj8mGN3z.lxH1cHjrrG3K"

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((value) => value.toLowerCase()),
  password: loginPasswordSchema,
})

export type AuthenticatedAdmin = {
  id: string
  email: string
  name: string
  role: "staff" | "manager" | "admin"
  sessionVersion: number
}

function identifierHash(email: string) {
  return createHash("sha256").update(email).digest("hex")
}

function loginRules(emailHash: string, ip: string): RateLimitRule[] {
  const accountRule: RateLimitRule = {
    scope: "login-account",
    identifier: emailHash,
    limit: 20,
    windowMs: LOGIN_WINDOW_MS,
    blockMs: LOGIN_BLOCK_MS,
  }

  if (ip === "unknown") return [accountRule]

  return [
    {
      scope: "login-account-ip",
      identifier: `${emailHash}:${ip}`,
      limit: 5,
      windowMs: LOGIN_WINDOW_MS,
      blockMs: LOGIN_BLOCK_MS,
    },
    {
      scope: "login-ip",
      identifier: ip,
      limit: 40,
      windowMs: LOGIN_WINDOW_MS,
      blockMs: LOGIN_BLOCK_MS,
    },
    accountRule,
  ]
}

export async function authenticateAdmin(
  credentials: unknown,
  request?: Request
): Promise<AuthenticatedAdmin | null> {
  const parsed = credentialsSchema.safeParse(credentials)
  if (!parsed.success) return null

  const now = new Date()
  const emailHash = identifierHash(parsed.data.email)
  const ip = request ? getClientIp(request) : "unknown"
  const rules = loginRules(emailHash, ip)
  const attempts = await Promise.all(
    rules.map((rule) => consumeRateLimit(rule, now))
  )
  if (attempts.some((decision) => !decision.allowed)) return null

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      isActive: true,
      sessionVersion: true,
    },
  })
  const passwordMatches = await compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  )
  if (
    !passwordMatches ||
    !user ||
    !user.isActive ||
    !["staff", "manager", "admin"].includes(user.role)
  ) {
    const locked = attempts.some((attempt) => attempt.newlyBlocked)
    await writeSecurityAudit({
      action: locked ? "auth.loginLocked" : "auth.loginFailed",
      entityType: "adminUser",
      entityId: hashSecurityIdentifier(parsed.data.email),
      result: locked ? "blocked" : "failure",
      request,
    })
    return null
  }

  await clearRateLimit(rules.filter((rule) => rule.scope !== "login-ip"))
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: now },
  })
  await writeSecurityAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.loginSucceeded",
    entityType: "adminUser",
    entityId: user.id,
    request,
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthenticatedAdmin["role"],
    sessionVersion: user.sessionVersion,
  }
}
