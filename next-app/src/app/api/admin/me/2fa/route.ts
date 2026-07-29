import { compare } from "bcryptjs"
import { z } from "zod"

import { auth } from "@/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import prisma from "@/lib/prisma"
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requestContext } from "@/lib/request-context"
import { writeSecurityAudit } from "@/lib/security-audit"
import {
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/two-factor"

const disableSchema = z.object({
  password: z.string().min(1).max(200),
  otp: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
})

export async function DELETE(request: Request) {
  const context = requestContext(request)
  const session = await auth()
  if (!session?.user.id || session.user.role !== "admin")
    return apiError(403, "FORBIDDEN", "Administrator access required.", undefined, context)
  const decision = await consumeRateLimit({
    scope: "admin-2fa-management",
    identifier: session.user.id,
    limit: 5,
    windowMs: 10 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
  })
  if (!decision.allowed) return rateLimitResponse(decision)

  const parsed = disableSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || (!parsed.data.otp && !parsed.data.recoveryCode))
    return apiError(400, "INVALID_REQUEST", "Password and a second factor are required.", undefined, context)

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isActive: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorLastUsedStep: true,
    },
  })
  const passwordValid = await compare(
    parsed.data.password,
    user?.passwordHash ?? "$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZTkHDJqDUj8mGN3z.lxH1cHjrrG3K"
  )
  if (!user?.isActive || !user.twoFactorEnabled || !passwordValid)
    return apiError(403, "REAUTHENTICATION_FAILED", "Reauthentication failed.", undefined, context)

  let factorValid = false
  if (parsed.data.otp && user.twoFactorSecret) {
    const result = await verifyTotp(user.twoFactorSecret, parsed.data.otp, {
      afterTimeStep: user.twoFactorLastUsedStep,
    })
    factorValid = result.valid
  } else if (parsed.data.recoveryCode) {
    const consumed = await prisma.twoFactorRecoveryCode.updateMany({
      where: {
        adminUserId: user.id,
        codeHash: hashRecoveryCode(parsed.data.recoveryCode),
        usedAt: null,
      },
      data: { usedAt: new Date() },
    })
    factorValid = consumed.count === 1
  }
  if (!factorValid)
    return apiError(403, "INVALID_SECOND_FACTOR", "The second factor is invalid.", undefined, context)

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { adminUserId: user.id } }),
    prisma.adminUser.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorPendingSecret: null,
        twoFactorConfirmedAt: null,
        twoFactorLastUsedStep: null,
        sessionVersion: { increment: 1 },
      },
    }),
  ])
  await writeSecurityAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.2faDisabled",
    entityType: "adminUser",
    entityId: user.id,
    request,
  })
  return apiSuccess({ disabled: true }, 200, context)
}
