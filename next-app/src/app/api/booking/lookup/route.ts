import { NextRequest } from "next/server"
import { z } from "zod"
import { apiError, apiSuccess } from "@/lib/api-response"
import { BOOKING_LOOKUP_ERROR, lookupBooking } from "@/lib/booking-lookup-service"
import { logger } from "@/lib/logger"
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-context"
import { canonicalizeVietnamPhone, isValidVietnamPhone } from "@/lib/utils"

const lookupSchema = z.object({
  code: z.string().trim().min(4).max(20).transform((value) => value.toUpperCase()),
  phone: z.string().trim().refine(isValidVietnamPhone, "Số điện thoại không hợp lệ.").transform(canonicalizeVietnamPhone),
}).strict()

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsed = lookupSchema.safeParse(params)
  if (!parsed.success) return apiError(400, "INVALID_QUERY_PARAMETER", "Vui lòng nhập mã booking và số điện thoại hợp lệ.")

  const rules = [
    { scope: "booking-lookup-ip", identifier: getClientIp(request), limit: 20, windowMs: 15 * 60_000 },
    { scope: "booking-lookup-code", identifier: parsed.data.code, limit: 10, windowMs: 15 * 60_000 },
    { scope: "booking-lookup-phone", identifier: parsed.data.phone, limit: 10, windowMs: 15 * 60_000 },
  ]
  for (const rule of rules) {
    const decision = await consumeRateLimit(rule)
    if (!decision.allowed) return rateLimitResponse(decision)
  }

  try {
    const result = await lookupBooking(parsed.data.code, parsed.data.phone)
    if (!result) return apiError(404, "BOOKING_LOOKUP_FAILED", BOOKING_LOOKUP_ERROR)
    return apiSuccess({ booking: result })
  } catch (error) {
    logger.error("booking_lookup_failed", { route: "/api/booking/lookup", method: "GET", errorCode: error instanceof Error ? error.name : "UNKNOWN" })
    return apiError(500, "BOOKING_LOOKUP_FAILED", BOOKING_LOOKUP_ERROR)
  }
}
