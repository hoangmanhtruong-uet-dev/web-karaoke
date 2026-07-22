import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import {
  bookingInputSchema,
  DEFAULT_DURATION_HOURS,
} from "@/lib/booking-domain"
import {
  BookingBusinessError,
  createBooking,
  normalizeRoomTier,
} from "@/lib/booking-service"
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : Number.NaN
}

function normalizePayload(body: unknown) {
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {}
  const roomTierValue = readString(record.roomType ?? record.roomTier)
  return {
    customerName: readString(record.name ?? record.customerName),
    customerPhone: readString(record.phone ?? record.customerPhone),
    branchId: readString(record.branchId),
    roomTier: roomTierValue
      ? (normalizeRoomTier(roomTierValue) ?? roomTierValue)
      : undefined,
    date: readString(record.date),
    startTime: readString(record.time ?? record.startTime),
    durationHours:
      record.durationHours === undefined
        ? DEFAULT_DURATION_HOURS
        : readNumber(record.durationHours),
    guestCount: readNumber(record.guests ?? record.guestCount),
    selectedMenuIds: readStringArray(
      record.selectedMenuItems ?? record.selectedMenuIds
    ),
    note: readString(record.note),
  }
}

async function postBooking(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const ipLimit = await consumeRateLimit({
    scope: "booking-ip",
    identifier: getClientIp(request),
    limit: 20,
    windowMs: 15 * 60_000,
  })
  if (ipLimit.newlyBlocked)
    await emitSecurityAlert({
      action: "booking.rateLimited",
      entityType: "publicApi",
      entityId: "booking",
      reason: "ip_quota",
      request,
    })
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit)

  const idempotencyKeyResult = idempotencyKeySchema.safeParse(
    request.headers.get("Idempotency-Key")
  )
  if (!idempotencyKeyResult.success)
    return apiError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "A valid Idempotency-Key header is required."
    )

  let body: unknown
  try {
    body = await readJsonBody(request, 16 * 1024)
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(
        error.status,
        error.code,
        "Request body is invalid or too large."
      )
    return apiError(400, "INVALID_JSON", "Request body is not valid JSON.")
  }

  const parsed = bookingInputSchema.safeParse(normalizePayload(body))
  if (!parsed.success)
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Invalid booking details.",
      parsed.error.flatten().fieldErrors
    )

  const phoneLimit = await consumeRateLimit({
    scope: "booking-phone",
    identifier: parsed.data.customerPhone.replace(/\D/g, ""),
    limit: 5,
    windowMs: 60 * 60_000,
  })
  if (phoneLimit.newlyBlocked)
    await emitSecurityAlert({
      action: "booking.rateLimited",
      entityType: "publicApi",
      entityId: "booking",
      reason: "phone_quota",
      request,
    })
  if (!phoneLimit.allowed) return rateLimitResponse(phoneLimit)

  try {
    const result = await createBooking(
      parsed.data,
      idempotencyKeyResult.data,
      new Date(),
      request
    )
    return apiSuccess(
      {
        bookingId: result.bookingId,
        replayed: result.replayed,
        expiresAt: result.expiresAt?.toISOString() ?? null,
        message: "Booking request received.",
      },
      result.replayed ? 200 : 201
    )
  } catch (error) {
    if (error instanceof BookingBusinessError)
      return apiError(
        error.status,
        error.code,
        error.message,
        error.fieldErrors
      )
    throw error
  }
}

export const POST = withOperationalErrorHandling("booking.create", postBooking)
