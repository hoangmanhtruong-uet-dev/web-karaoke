import { NextRequest } from "next/server"
import { Prisma, RoomStatus, RoomTier } from "@prisma/client"

import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { operationalErrorResponse } from "@/lib/operational-error"

function isRoomStatus(value: string): value is RoomStatus {
  return Object.values(RoomStatus).includes(value as RoomStatus)
}

function isRoomTier(value: string): value is RoomTier {
  return Object.values(RoomTier).includes(value as RoomTier)
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const branchId = url.searchParams.get("branchId")
    const status = url.searchParams.get("status")
    const tier = url.searchParams.get("tier")

    const where: Prisma.RoomWhereInput = {}

    if (branchId) where.branchId = branchId
    if (status && isRoomStatus(status)) where.status = status
    if (tier && isRoomTier(tier)) where.tier = tier

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
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

    return apiSuccess({ rooms }, 200, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    if (error instanceof Error)
      return operationalErrorResponse(error, "rooms.list")
    return apiError(500, "ROOMS_LOAD_FAILED", "Không thể tải danh sách phòng.")
  }
}
