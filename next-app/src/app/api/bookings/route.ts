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
  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {}
  const roomTierValue = readString(record.roomType ?? record.roomTier)

  return {
    customerName: readString(record.name ?? record.customerName),
    customerPhone: readString(record.phone ?? record.customerPhone),
    branchId: readString(record.branchId),
    roomTier: roomTierValue ? normalizeRoomTier(roomTierValue) ?? roomTierValue : undefined,
    date: readString(record.date),
    startTime: readString(record.time ?? record.startTime),
    durationHours:
      record.durationHours === undefined
        ? DEFAULT_DURATION_HOURS
        : readNumber(record.durationHours),
    guestCount: readNumber(record.guests ?? record.guestCount),
    selectedMenuIds: readStringArray(record.selectedMenuItems ?? record.selectedMenuIds),
    note: readString(record.note),
  }
}

export async function POST(request: Request) {
  const idempotencyKeyResult = idempotencyKeySchema.safeParse(
    request.headers.get("Idempotency-Key")
  )

  if (!idempotencyKeyResult.success) {
    return apiError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Header Idempotency-Key hợp lệ là bắt buộc."
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, "INVALID_JSON", "Nội dung request không phải JSON hợp lệ.")
  }

  const parsed = bookingInputSchema.safeParse(normalizePayload(body))

  if (!parsed.success) {
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Thông tin đặt phòng chưa hợp lệ.",
      parsed.error.flatten().fieldErrors
    )
  }

  try {
    const result = await createBooking(parsed.data, idempotencyKeyResult.data)

    return apiSuccess(
      {
        bookingId: result.bookingId,
        replayed: result.replayed,
        expiresAt: result.expiresAt?.toISOString() ?? null,
        message: "Đã nhận yêu cầu đặt phòng. Nhân viên sẽ liên hệ xác nhận trong ít phút.",
      },
      result.replayed ? 200 : 201
    )
  } catch (error) {
    if (error instanceof BookingBusinessError) {
      return apiError(error.status, error.code, error.message, error.fieldErrors)
    }

    console.error("Booking creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return apiError(
      500,
      "BOOKING_CREATION_FAILED",
      "Không thể xử lý yêu cầu đặt phòng lúc này. Vui lòng thử lại sau."
    )
  }
}
