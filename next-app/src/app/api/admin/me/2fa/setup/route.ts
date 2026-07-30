import { compare } from "bcryptjs"
import QRCode from "qrcode"
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
import {
  createTotpEnrollment,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/two-factor"

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("begin"),
    password: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal("confirm"),
    password: z.string().min(1).max(200),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  }),
])

class TwoFactorSessionConflict extends Error {}

export async function POST(request: Request) {
  const origin = requireSameOrigin(request)
  if (origin) return origin
  const context = requestContext(request)

  try {
    const authorization = await authorizeAdminTwoFactorManagement(request)
    if ("response" in authorization) return authorization.response
    const { principal } = authorization

    const parsed = bodySchema.safeParse(await readJsonBody(request, 8 * 1024))
    if (!parsed.success)
      return apiError(
        400,
        "INVALID_REQUEST",
        "Invalid two-factor request.",
        undefined,
        context
      )

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

    if (!(await compare(parsed.data.password, principal.passwordHash))) {
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

    if (parsed.data.action === "begin") {
      if (principal.twoFactorEnabled)
        return apiError(
          409,
          "TWO_FACTOR_ALREADY_ENABLED",
          "Two-factor authentication is already enabled.",
          undefined,
          context
        )

      const enrollment = createTotpEnrollment(principal.email)
      const pendingSecret = encryptTotpSecret(enrollment.secret)
      await prisma.$transaction(async (tx) => {
        const updated = await tx.adminUser.updateMany({
          where: {
            id: principal.id,
            isActive: true,
            role: "admin",
            sessionVersion: principal.sessionVersion,
            twoFactorEnabled: false,
          },
          data: { twoFactorPendingSecret: pendingSecret },
        })
        if (updated.count !== 1) throw new TwoFactorSessionConflict()
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            actorRole: principal.role,
            action: "auth.2faSetupStarted",
            entityType: "adminUser",
            entityId: principal.id,
            result: "success",
            ...context,
          },
        })
      })
      const qrDataUrl = await QRCode.toDataURL(enrollment.uri, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 256,
      })
      return apiSuccess(
        { qrDataUrl, manualKey: enrollment.secret },
        200,
        context
      )
    }

    if (!principal.twoFactorPendingSecret)
      return apiError(
        409,
        "TWO_FACTOR_SETUP_NOT_STARTED",
        "Start setup before confirming.",
        undefined,
        context
      )

    const verification = await verifyTotp(
      principal.twoFactorPendingSecret,
      parsed.data.otp
    )
    if (!verification.valid) {
      await writeSecurityAudit({
        actorId: principal.id,
        actorRole: principal.role,
        action: decision.newlyBlocked
          ? "auth.2faSetupBlocked"
          : "auth.2faSetupFailed",
        entityType: "adminUser",
        entityId: principal.id,
        result: decision.newlyBlocked ? "blocked" : "failure",
        request,
      })
      return apiError(
        400,
        "INVALID_OTP",
        "The verification code is invalid or expired.",
        undefined,
        context
      )
    }

    const recoveryCodes = generateRecoveryCodes()
    await prisma.$transaction(async (tx) => {
      const updated = await tx.adminUser.updateMany({
        where: {
          id: principal.id,
          isActive: true,
          role: "admin",
          sessionVersion: principal.sessionVersion,
          twoFactorEnabled: false,
          twoFactorPendingSecret: principal.twoFactorPendingSecret,
        },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: principal.twoFactorPendingSecret,
          twoFactorPendingSecret: null,
          twoFactorConfirmedAt: new Date(),
          twoFactorLastUsedStep: verification.timeStep,
          sessionVersion: { increment: 1 },
        },
      })
      if (updated.count !== 1) throw new TwoFactorSessionConflict()
      await tx.twoFactorRecoveryCode.deleteMany({
        where: { adminUserId: principal.id },
      })
      await tx.twoFactorRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          adminUserId: principal.id,
          codeHash: hashRecoveryCode(code),
        })),
      })
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          actorRole: principal.role,
          action: "auth.2faEnabled",
          entityType: "adminUser",
          entityId: principal.id,
          result: "success",
          ...context,
        },
      })
    })
    return apiSuccess(
      {
        recoveryCodes,
        sessionsRevoked: true,
        message: "Save these recovery codes now. They will not be shown again.",
      },
      200,
      context
    )
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(
        error.status,
        error.code,
        "Invalid request body.",
        undefined,
        context
      )
    if (error instanceof TwoFactorSessionConflict) {
      return apiError(
        401,
        "UNAUTHORIZED",
        "Authentication required.",
        undefined,
        context
      )
    }
    logger.error("admin_2fa_setup_failed", {
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
