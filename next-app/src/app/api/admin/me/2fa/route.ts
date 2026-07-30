import { compare } from "bcryptjs"
import { z } from "zod"

import { authorizeAdminTwoFactorManagement } from "@/lib/admin-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { logger } from "@/lib/logger"
import prisma from "@/lib/prisma"
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requestContext } from "@/lib/request-context"
import {
  readJsonBody,
  RequestBodyError,
  requireSameOrigin,
} from "@/lib/request-security"
import { writeSecurityAudit } from "@/lib/security-audit"
import { hashRecoveryCode, verifyTotp } from "@/lib/two-factor"

const disableSchema = z
  .object({
    password: z.string().min(1).max(200),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/)
      .optional(),
    recoveryCode: z.string().trim().min(1).max(40).optional(),
  })
  .strict()

class TwoFactorSessionConflict extends Error {}

export async function DELETE(request: Request) {
  const origin = requireSameOrigin(request)
  if (origin) return origin
  const context = requestContext(request)

  try {
    const authorization = await authorizeAdminTwoFactorManagement(request)
    if ("response" in authorization) return authorization.response
    const { principal } = authorization

    const decision = await consumeRateLimit({
      scope: "admin-2fa-management",
      identifier: principal.id,
      limit: 5,
      windowMs: 10 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    })
    if (!decision.allowed) {
      await writeSecurityAudit({
        actorId: principal.id,
        actorRole: principal.role,
        action: "auth.2faManagementBlocked",
        entityType: "adminUser",
        entityId: principal.id,
        result: "blocked",
        request,
      })
      return rateLimitResponse(decision)
    }

    const parsed = disableSchema.safeParse(
      await readJsonBody(request, 8 * 1024)
    )
    if (!parsed.success || (!parsed.data.otp && !parsed.data.recoveryCode))
      return apiError(
        400,
        "INVALID_REQUEST",
        "Password and a second factor are required.",
        undefined,
        context
      )

    const passwordValid = await compare(
      parsed.data.password,
      principal.passwordHash
    )
    if (!principal.twoFactorEnabled || !passwordValid) {
      await writeSecurityAudit({
        actorId: principal.id,
        actorRole: principal.role,
        action: "auth.2faReauthenticationFailed",
        entityType: "adminUser",
        entityId: principal.id,
        result: decision.newlyBlocked ? "blocked" : "failure",
        request,
      })
      return apiError(
        403,
        "REAUTHENTICATION_FAILED",
        "Reauthentication failed.",
        undefined,
        context
      )
    }

    let totpValid = false
    if (parsed.data.otp && principal.twoFactorSecret) {
      const result = await verifyTotp(
        principal.twoFactorSecret,
        parsed.data.otp,
        { afterTimeStep: principal.twoFactorLastUsedStep }
      )
      totpValid = result.valid
      if (!totpValid) {
        await writeSecurityAudit({
          actorId: principal.id,
          actorRole: principal.role,
          action: "auth.2faDisableFailed",
          entityType: "adminUser",
          entityId: principal.id,
          result: decision.newlyBlocked ? "blocked" : "failure",
          request,
        })
        return apiError(
          403,
          "INVALID_SECOND_FACTOR",
          "The second factor is invalid.",
          undefined,
          context
        )
      }
    }

    const recoveryCodeHash = parsed.data.recoveryCode
      ? hashRecoveryCode(parsed.data.recoveryCode)
      : null

    const disabled = await prisma.$transaction(async (tx) => {
      if (!totpValid) {
        if (!recoveryCodeHash) return false
        const consumed = await tx.twoFactorRecoveryCode.updateMany({
          where: {
            adminUserId: principal.id,
            codeHash: recoveryCodeHash,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        })
        if (consumed.count !== 1) return false
      }

      const updated = await tx.adminUser.updateMany({
        where: {
          id: principal.id,
          isActive: true,
          role: "admin",
          sessionVersion: principal.sessionVersion,
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
      if (updated.count !== 1) throw new TwoFactorSessionConflict()
      await tx.twoFactorRecoveryCode.deleteMany({
        where: { adminUserId: principal.id },
      })
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          actorRole: principal.role,
          action: "auth.2faDisabled",
          entityType: "adminUser",
          entityId: principal.id,
          result: "success",
          ...context,
        },
      })
      return true
    })
    if (!disabled) {
      await writeSecurityAudit({
        actorId: principal.id,
        actorRole: principal.role,
        action: "auth.2faDisableFailed",
        entityType: "adminUser",
        entityId: principal.id,
        result: "failure",
        request,
      })
      return apiError(
        403,
        "INVALID_SECOND_FACTOR",
        "The second factor is invalid.",
        undefined,
        context
      )
    }
    return apiSuccess({ disabled: true, sessionsRevoked: true }, 200, context)
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(
        error.status,
        error.code,
        "Invalid request body.",
        undefined,
        context
      )
    if (error instanceof TwoFactorSessionConflict)
      return apiError(
        401,
        "UNAUTHORIZED",
        "Authentication required.",
        undefined,
        context
      )
    logger.error("admin_2fa_disable_failed", {
      requestId: context.requestId,
      errorCode: error instanceof Error ? error.constructor.name : "UNKNOWN",
    })
    return apiError(
      500,
      "TWO_FACTOR_OPERATION_FAILED",
      "Unable to complete the two-factor operation.",
      undefined,
      context
    )
  }
}
