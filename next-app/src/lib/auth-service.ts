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
import {
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/two-factor"

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
  otp: z.string().trim().max(20).optional(),
  recoveryCode: z.string().trim().max(40).optional(),
})

export type AuthenticatedAdmin = {
  id: string
  email: string
  name: string
  role: "staff" | "manager" | "admin"
  sessionVersion: number
  twoFactorVerified: boolean
  requiresTwoFactorSetup: boolean
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
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorLastUsedStep: true,
      twoFactorConfirmedAt: true,
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

  let twoFactorVerified = user.role !== "admin"
  let requiresTwoFactorSetup = false

  if (user.role === "admin") {
    if (!user.twoFactorEnabled || !user.twoFactorConfirmedAt) {
      requiresTwoFactorSetup = true
    } else {
      const factorRules: RateLimitRule[] = [
        {
          scope: "admin-2fa-account",
          identifier: user.id,
          limit: 5,
          windowMs: 10 * 60 * 1000,
          blockMs: 15 * 60 * 1000,
        },
        ...(ip === "unknown"
          ? []
          : [{
              scope: "admin-2fa-account-ip",
              identifier: `${user.id}:${ip}`,
              limit: 5,
              windowMs: 10 * 60 * 1000,
              blockMs: 15 * 60 * 1000,
            }]),
      ]
      const factorAttempts = await Promise.all(
        factorRules.map((rule) => consumeRateLimit(rule, now))
      )
      if (factorAttempts.some((decision) => !decision.allowed)) {
        await writeSecurityAudit({
          actorId: user.id,
          actorRole: user.role,
          action: "auth.2faRateLimited",
          entityType: "adminUser",
          entityId: user.id,
          result: "blocked",
          request,
        })
        return null
      }

      const otp = parsed.data.otp?.replace(/\s/g, "")
      if (otp && user.twoFactorSecret) {
        const result = await verifyTotp(user.twoFactorSecret, otp, {
          afterTimeStep: user.twoFactorLastUsedStep,
        })
        if (result.valid) {
          const claimed = await prisma.adminUser.updateMany({
            where: {
              id: user.id,
              OR: [
                { twoFactorLastUsedStep: null },
                { twoFactorLastUsedStep: { lt: result.timeStep } },
              ],
            },
            data: { twoFactorLastUsedStep: result.timeStep },
          })
          twoFactorVerified = claimed.count === 1
        }
      } else if (parsed.data.recoveryCode) {
        const consumed = await prisma.twoFactorRecoveryCode.updateMany({
          where: {
            adminUserId: user.id,
            codeHash: hashRecoveryCode(parsed.data.recoveryCode),
            usedAt: null,
          },
          data: { usedAt: now },
        })
        twoFactorVerified = consumed.count === 1
      }

      if (!twoFactorVerified) {
        await writeSecurityAudit({
          actorId: user.id,
          actorRole: user.role,
          action: "auth.2faFailed",
          entityType: "adminUser",
          entityId: user.id,
          result: "failure",
          request,
        })
        return null
      }
      await clearRateLimit(factorRules)
    }
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
    twoFactorVerified,
    requiresTwoFactorSetup,
  }
}
