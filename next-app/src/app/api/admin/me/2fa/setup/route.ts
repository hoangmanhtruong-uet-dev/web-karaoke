import { compare } from "bcryptjs"
import QRCode from "qrcode"
import { z } from "zod"

import { auth } from "@/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import prisma from "@/lib/prisma"
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { requestContext } from "@/lib/request-context"
import { requireSameOrigin } from "@/lib/request-security"
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
    otp: z.string().trim().regex(/^\d{6}$/),
  }),
])

export async function POST(request: Request) {
  const origin = requireSameOrigin(request)
  if (origin) return origin
  const context = requestContext(request)
  const session = await auth()
  if (!session?.user.id || session.user.role !== "admin")
    return apiError(403, "FORBIDDEN", "Administrator access required.", undefined, context)

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return apiError(400, "INVALID_REQUEST", "Invalid two-factor request.", undefined, context)

  const decision = await consumeRateLimit({
    scope: "admin-2fa-management",
    identifier: session.user.id,
    limit: 5,
    windowMs: 10 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
  })
  if (!decision.allowed) return rateLimitResponse(decision)

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorPendingSecret: true,
    },
  })
  const passwordValid = await compare(
    parsed.data.password,
    user?.passwordHash ?? "$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZTkHDJqDUj8mGN3z.lxH1cHjrrG3K"
  )
  if (!user?.isActive || !passwordValid)
    return apiError(403, "REAUTHENTICATION_FAILED", "Reauthentication failed.", undefined, context)

  if (parsed.data.action === "begin") {
    if (user.twoFactorEnabled)
      return apiError(409, "TWO_FACTOR_ALREADY_ENABLED", "Two-factor authentication is already enabled.", undefined, context)
    const enrollment = createTotpEnrollment(user.email)
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { twoFactorPendingSecret: encryptTotpSecret(enrollment.secret) },
    })
    const qrDataUrl = await QRCode.toDataURL(enrollment.uri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
    })
    await writeSecurityAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.2faSetupStarted",
      entityType: "adminUser",
      entityId: user.id,
      request,
    })
    return apiSuccess({ qrDataUrl, manualKey: enrollment.secret }, 200, context)
  }

  if (!user.twoFactorPendingSecret)
    return apiError(409, "TWO_FACTOR_SETUP_NOT_STARTED", "Start setup before confirming.", undefined, context)
  const verification = await verifyTotp(
    user.twoFactorPendingSecret,
    parsed.data.otp
  )
  if (!verification.valid) {
    await writeSecurityAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.2faSetupFailed",
      entityType: "adminUser",
      entityId: user.id,
      result: "failure",
      request,
    })
    return apiError(400, "INVALID_OTP", "The verification code is invalid or expired.", undefined, context)
  }

  const recoveryCodes = generateRecoveryCodes()
  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { adminUserId: user.id } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({
        adminUserId: user.id,
        codeHash: hashRecoveryCode(code),
      })),
    }),
    prisma.adminUser.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorPendingSecret,
        twoFactorPendingSecret: null,
        twoFactorConfirmedAt: new Date(),
        twoFactorLastUsedStep: verification.timeStep,
        sessionVersion: { increment: 1 },
      },
    }),
  ])
  await writeSecurityAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.2faEnabled",
    entityType: "adminUser",
    entityId: user.id,
    request,
  })
  return apiSuccess(
    {
      recoveryCodes,
      message: "Save these recovery codes now. They will not be shown again.",
    },
    200,
    context
  )
}
