import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"

import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { OCCUPYING_BOOKING_STATUSES, roomHasCapacity, toVietnamBookingWindow } from "@/lib/booking-domain"
import { operationalErrorResponse } from "@/lib/operational-error"
import { publicRoomsQuerySchema, readQueryRecord } from "@/lib/public-catalog-query"

export async function GET(request: NextRequest) {
  try {
    const queryRecord = readQueryRecord(new URL(request.url).searchParams)
    if ("error" in queryRecord) {
      return apiError(400, "INVALID_QUERY_PARAMETER", queryRecord.error ?? "Query parameter không hợp lệ.")
    }

    const parsed = publicRoomsQuerySchema.safeParse(queryRecord.record)
    if (!parsed.success) {
      return apiError(400, "INVALID_QUERY_PARAMETER", parsed.error.issues[0]?.message ?? "Query parameter không hợp lệ.")
    }

    const { branchId, status, tier, date, startTime, durationHours, guestCount, limit } = parsed.data
    const where: Prisma.RoomWhereInput = { status }
    if (branchId) where.branchId = branchId
    if (tier) where.tier = tier

    let rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        branchId: true,
        name: true,
        slug: true,
        tier: true,
        capacity: true,
        hourlyRate: true,
        features: true,
        status: true,
        imageUrl: true,
        createdAt: true,
        branch: { select: { name: true, slug: true } },
      },
    })

    if (guestCount !== undefined) {
      rooms = rooms.filter((room) => roomHasCapacity(room.capacity, guestCount))
    }

    if (date && startTime && durationHours !== undefined) {
      const window = toVietnamBookingWindow(date, startTime, durationHours)
      if (!window) {
        return apiError(400, "INVALID_QUERY_PARAMETER", "Ngày, giờ hoặc durationHours không hợp lệ.")
      }

      const conflicts = await prisma.booking.findMany({
        where: {
          roomId: { not: null },
          status: { in: [...OCCUPYING_BOOKING_STATUSES] },
          startAt: { lt: window.endAt },
          endAt: { gt: window.startAt },
        },
        select: { roomId: true },
      })
      const blockedRoomIds = new Set(conflicts.flatMap((item) => item.roomId ? [item.roomId] : []))
      rooms = rooms.filter((room) => !blockedRoomIds.has(room.id))
    }

    return apiSuccess({ rooms }, 200, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    return operationalErrorResponse(error, "rooms.list")
  }
}