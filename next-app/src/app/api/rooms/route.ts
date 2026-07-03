import { NextRequest, NextResponse } from "next/server"
import { Prisma, RoomStatus, RoomTier } from "@prisma/client"

import prisma from "@/lib/prisma"

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

    return NextResponse.json({ rooms })
  } catch {
    return NextResponse.json({ error: "Không thể tải danh sách phòng" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}