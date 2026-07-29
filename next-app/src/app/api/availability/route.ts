import { NextRequest } from "next/server"
import { z } from "zod"
import { apiError, apiSuccess } from "@/lib/api-response"
import { availabilityWindow, getAvailability } from "@/lib/availability-service"
import { roomTierSchema } from "@/lib/booking-domain"
import { MAX_DURATION_HOURS, MIN_DURATION_HOURS } from "@/lib/booking-duration"
import { operationalErrorResponse } from "@/lib/operational-error"
import { readQueryRecord } from "@/lib/public-catalog-query"

const availabilityQuerySchema = z.object({
  branchId: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationHours: z.coerce.number().int().min(MIN_DURATION_HOURS).max(MAX_DURATION_HOURS),
  capacity: z.coerce.number().int().min(1).max(40),
  roomTier: roomTierSchema.optional(),
}).strict()

export async function GET(request: NextRequest) {
  try {
    const record = readQueryRecord(new URL(request.url).searchParams)
    if ("error" in record) return apiError(400, "INVALID_QUERY_PARAMETER", record.error ?? "Query khong hop le.")
    const parsed = availabilityQuerySchema.safeParse(record.record)
    if (!parsed.success) return apiError(400, "INVALID_QUERY_PARAMETER", parsed.error.issues[0]?.message ?? "Query không hợp lệ.")
    if (!availabilityWindow(parsed.data)) return apiError(400, "INVALID_QUERY_PARAMETER", "Ngày, giờ hoặc thời lượng không hợp lệ.")

    const result = await getAvailability(parsed.data)
    return apiSuccess({
      ...result,
      startAt: result.startAt.toISOString(),
      endAt: result.endAt.toISOString(),
      rooms: result.rooms.map((room) => ({ ...room, hourlyRate: Number(room.hourlyRate) })),
    })
  } catch (error) {
    return operationalErrorResponse(error, "availability.get", "AVAILABILITY_LOAD_FAILED", "Không thể kiểm tra phòng trống.")
  }
}
