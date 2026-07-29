import { Prisma, type RoomTier } from "@prisma/client"

import prisma from "@/lib/prisma"
import {
  OCCUPYING_BOOKING_STATUSES,
  toVietnamBookingWindow,
  type BookingWindow,
} from "@/lib/booking-domain"
import { MAX_DURATION_HOURS, MIN_DURATION_HOURS } from "@/lib/booking-duration"

export type AvailabilityQuery = {
  branchId: string
  date: string
  startTime: string
  durationHours: number
  capacity: number
  roomTier?: RoomTier
}

export type AvailabilityResult = {
  startAt: Date
  endAt: Date
  timezone: "Asia/Ho_Chi_Minh"
  rooms: Array<{
    id: string
    name: string
    tier: RoomTier
    capacity: unknown
    hourlyRate: number
    imageUrl: string | null
  }>
  reason: "NO_ACTIVE_BRANCH" | "NO_AVAILABLE_ROOM" | null
}

export function availabilityWindow(query: Pick<AvailabilityQuery, "date" | "startTime" | "durationHours">): BookingWindow | null {
  return toVietnamBookingWindow(query.date, query.startTime, query.durationHours)
}

export async function getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
  const window = availabilityWindow(query)
  if (!window) throw new Error("Invalid availability window")

  const branch = await prisma.branch.findFirst({
    where: { id: query.branchId, status: "active" },
    select: { id: true },
  })
  if (!branch) {
    return { startAt: window.startAt, endAt: window.endAt, timezone: "Asia/Ho_Chi_Minh", rooms: [], reason: "NO_ACTIVE_BRANCH" }
  }

  // This is intentionally the same overlap predicate and status set used by
  // createBooking. PostgreSQL remains the final authority via the exclusion constraint.
  const rooms = await prisma.$queryRaw<AvailabilityResult["rooms"]>(Prisma.sql`
    SELECT room.id, room.name, room.tier, room.capacity, room."hourlyRate", room."imageUrl"
    FROM "Room" AS room
    WHERE room."branchId" = ${query.branchId}
      AND room.status = 'available'::"RoomStatus"
      AND (${query.roomTier ?? null}::text IS NULL OR room.tier::text = ${query.roomTier ?? null})
      AND COALESCE(room.capacity->>'max', '') ~ '^[0-9]+$'
      AND (room.capacity->>'max')::integer >= ${query.capacity}
      AND NOT EXISTS (
        SELECT 1 FROM "Booking" AS booking
        WHERE booking."roomId" = room.id
          AND booking.status::text IN (${Prisma.join(OCCUPYING_BOOKING_STATUSES)})
          AND booking."startAt" < ${window.endAt}
          AND booking."endAt" > ${window.startAt}
      )
    ORDER BY room."createdAt" ASC, room.id ASC
  `)

  return {
    startAt: window.startAt,
    endAt: window.endAt,
    timezone: "Asia/Ho_Chi_Minh",
    rooms,
    reason: rooms.length ? null : "NO_AVAILABLE_ROOM",
  }
}

export const availabilityLimits = { minDuration: MIN_DURATION_HOURS, maxDuration: MAX_DURATION_HOURS }
