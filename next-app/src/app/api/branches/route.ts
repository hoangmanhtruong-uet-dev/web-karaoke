import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { BranchStatus } from "@prisma/client"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get("status")

    const where = statusParam && Object.values(BranchStatus).includes(statusParam as BranchStatus)
      ? { status: statusParam as BranchStatus }
      : {}

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        district: true,
        city: true,
        phone: true,
        email: true,
        openingHours: true,
        amenities: true,
        status: true,
        imageUrl: true,
        _count: { select: { rooms: true } },
      },
    })

    return apiSuccess({ branches })
  } catch {
    return apiError(500, "BRANCHES_LOAD_FAILED", "Không thể tải danh sách chi nhánh.")
  }
}
