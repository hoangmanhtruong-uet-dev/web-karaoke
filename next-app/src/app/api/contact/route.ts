import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { contactRequestSchema } from "@/lib/contact-domain"
import { enqueueOutbox } from "@/lib/outbox"
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-context"
import {
  readJsonBody,
  RequestBodyError,
  requireSameOrigin,
} from "@/lib/request-security"
import { emitSecurityAlert } from "@/lib/security-audit"

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const ipLimit = await consumeRateLimit({
    scope: "contact-ip",
    identifier: getClientIp(request),
    limit: 10,
    windowMs: 15 * 60_000,
  })
  if (ipLimit.newlyBlocked)
    await emitSecurityAlert({
      action: "contact.rateLimited",
      entityType: "publicApi",
      entityId: "contact",
      reason: "ip_quota",
      request,
    })
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit)

  let body: unknown
  try {
    body = await readJsonBody(request, 12 * 1024)
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(
        error.status,
        error.code,
        "Request body is invalid or too large."
      )
    return apiError(400, "INVALID_JSON", "Request body is not valid JSON.")
  }

  const parsed = contactRequestSchema.safeParse(body)
  if (!parsed.success)
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Invalid contact details.",
      parsed.error.flatten().fieldErrors
    )

  const identity =
    parsed.data.email?.toLowerCase() || parsed.data.phone.replace(/\D/g, "")
  const identityLimit = await consumeRateLimit({
    scope: "contact-identity",
    identifier: identity,
    limit: 3,
    windowMs: 60 * 60_000,
  })
  if (identityLimit.newlyBlocked)
    await emitSecurityAlert({
      action: "contact.rateLimited",
      entityType: "publicApi",
      entityId: "contact",
      reason: "identity_quota",
      request,
    })
  if (!identityLimit.allowed) return rateLimitResponse(identityLimit)

  const notificationLimit = await consumeRateLimit({
    scope: "contact-notification-global",
    identifier: "notification-budget",
    limit: 100,
    windowMs: 15 * 60_000,
  })
  if (notificationLimit.newlyBlocked)
    await emitSecurityAlert({
      action: "contact.notificationQuotaReached",
      entityType: "outbox",
      entityId: "contact",
      reason: "global_notification_quota",
      request,
    })

  try {
    const contactRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.contactRequest.create({
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email || null,
          message: parsed.data.message,
        },
        select: { id: true, createdAt: true },
      })
      if (notificationLimit.allowed) {
        await enqueueOutbox(tx, {
          eventType: "contactRequestCreated",
          aggregateType: "contactRequest",
          aggregateId: created.id,
          idempotencyKey: `contact:${created.id}:created`,
        })
      }
      return created
    })
    return apiSuccess(
      {
        contactRequestId: contactRequest.id,
        createdAt: contactRequest.createdAt.toISOString(),
        message: "Contact request received.",
      },
      201
    )
  } catch (error) {
    console.error("Contact request persistence failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return apiError(
      500,
      "CONTACT_PERSISTENCE_FAILED",
      "Unable to save the contact request."
    )
  }
}
