import { compare, hash } from "bcryptjs"
import { z } from "zod"

import { getAdminPrincipal } from "@/lib/admin-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { currentPasswordSchema, passwordSchema } from "@/lib/password-policy"
import prisma from "@/lib/prisma"
import {
  clearRateLimit,
  consumeRateLimit,
  rateLimitResponse,
  type RateLimitRule,
} from "@/lib/rate-limit"
import { getClientIp, requestContext } from "@/lib/request-context"
import {
  readJsonBody,
  RequestBodyError,
  requireSameOrigin,
} from "@/lib/request-security"
import { writeSecurityAudit } from "@/lib/security-audit"

const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000
const PASSWORD_CHANGE_BLOCK_MS = 15 * 60 * 1000

const schema = z
  .object({
    currentPassword: currentPasswordSchema,
    newPassword: passwordSchema,
  })
  .strict()

class PasswordChangeConflict extends Error {}

function passwordChangeRules(accountId: string, ip: string): RateLimitRule[] {
  const accountRule: RateLimitRule = {
    scope: "password-change-account",
    identifier: accountId,
    limit: 5,
    windowMs: PASSWORD_CHANGE_WINDOW_MS,
    blockMs: PASSWORD_CHANGE_BLOCK_MS,
  }

  if (ip === "unknown") return [accountRule]

  return [
    accountRule,
    {
      scope: "password-change-account-ip",
      identifier: `${accountId}:${ip}`,
      limit: 5,
      windowMs: PASSWORD_CHANGE_WINDOW_MS,
      blockMs: PASSWORD_CHANGE_BLOCK_MS,
    },
    {
      scope: "password-change-ip",
      identifier: ip,
      limit: 20,
      windowMs: PASSWORD_CHANGE_WINDOW_MS,
      blockMs: PASSWORD_CHANGE_BLOCK_MS,
    },
  ]
}

export async function POST(request: Request) {
  const origin = requireSameOrigin(request)
  if (origin) return origin
  const principal = await getAdminPrincipal()
  if (!principal)
    return apiError(401, "UNAUTHORIZED", "Authentication required.")
  try {
    const rules = passwordChangeRules(principal.id, getClientIp(request))
    const attempts = await Promise.all(
      rules.map((rule) => consumeRateLimit(rule))
    )
    const blockedDecision = attempts.find((decision) => !decision.allowed)
    if (blockedDecision) return rateLimitResponse(blockedDecision)

    const parsed = schema.safeParse(await readJsonBody(request, 8 * 1024))
    if (!parsed.success)
      return apiError(
        422,
        "VALIDATION_ERROR",
        "Password does not meet the security policy.",
        parsed.error.flatten().fieldErrors
      )
    const user = await prisma.adminUser.findUnique({
      where: { id: principal.id },
      select: { passwordHash: true, sessionVersion: true },
    })
    if (
      !user ||
      !(await compare(parsed.data.currentPassword, user.passwordHash))
    ) {
      const blocked = attempts.find((attempt) => attempt.newlyBlocked)
      await writeSecurityAudit({
        actorId: principal.id,
        actorRole: principal.role,
        action: blocked
          ? "auth.passwordChangeBlocked"
          : "auth.passwordChangeFailed",
        entityType: "adminUser",
        entityId: principal.id,
        result: blocked ? "blocked" : "failure",
        request,
      })
      if (blocked) return rateLimitResponse(blocked)
      return apiError(
        400,
        "INVALID_CURRENT_PASSWORD",
        "Current password is invalid."
      )
    }
    await clearRateLimit(
      rules.filter((rule) => rule.scope !== "password-change-ip")
    )
    if (await compare(parsed.data.newPassword, user.passwordHash)) {
      return apiError(422, "PASSWORD_REUSED", "New password must be different.")
    }
    const passwordHash = await hash(parsed.data.newPassword, 12)
    const context = requestContext(request)
    await prisma.$transaction(async (tx) => {
      const updated = await tx.adminUser.updateMany({
        where: {
          id: principal.id,
          isActive: true,
          passwordHash: user.passwordHash,
          sessionVersion: user.sessionVersion,
        },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          sessionVersion: { increment: 1 },
        },
      })
      if (updated.count !== 1) throw new PasswordChangeConflict()
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          actorRole: principal.role,
          action: "auth.passwordChanged",
          entityType: "adminUser",
          entityId: principal.id,
          result: "success",
          ...context,
        },
      })
    })
    return apiSuccess({ changed: true, sessionsRevoked: true })
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(error.status, error.code, "Invalid request body.")
    if (error instanceof PasswordChangeConflict) {
      return apiError(
        409,
        "PASSWORD_CHANGE_CONFLICT",
        "Your account changed during this request. Sign in again and retry."
      )
    }
    throw error
  }
}
