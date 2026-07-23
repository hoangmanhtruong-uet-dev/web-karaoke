import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import { contactRequestSchema } from "@/lib/contact-domain"
import {
  ContactBusinessError,
  createContactRequest,
} from "@/lib/contact-service"
import { withOperationalErrorHandling } from "@/lib/operational-error"
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-context"
import {
  readJsonBody,
  RequestBodyError,
  requireSameOrigin,
} from "@/lib/request-security"
import { emitSecurityAlert } from "@/lib/security-audit"

const idempotencyKeySchema = z.string().trim().min(16).max(100)

async function postContact(request: Request) {
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

  const idempotencyKey = idempotencyKeySchema.safeParse(
    request.headers.get("Idempotency-Key")
  )
  if (!idempotencyKey.success)
    return apiError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "A valid Idempotency-Key header is required."
    )

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
    const contact = await createContactRequest(
      parsed.data,
      idempotencyKey.data,
      notificationLimit.allowed
    )
    return apiSuccess(
      {
        contactRequestId: contact.id,
        createdAt: contact.createdAt.toISOString(),
        replayed: contact.replayed,
        message: "Contact request received.",
      },
      contact.replayed ? 200 : 201
    )
  } catch (error) {
    if (error instanceof ContactBusinessError)
      return apiError(error.status, error.code, error.message)
    throw error
  }
}

export const POST = withOperationalErrorHandling("contact.create", postContact)
