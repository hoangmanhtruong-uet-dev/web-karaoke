import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { BranchStatus } from "@prisma/client"
import { apiSuccess } from "@/lib/api-response"
import { operationalErrorResponse } from "@/lib/operational-error"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get("status")

    const where =
      statusParam &&
      Object.values(BranchStatus).includes(statusParam as BranchStatus)
        ? { status: statusParam as BranchStatus }
        : {}

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
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

    return apiSuccess({ branches }, 200, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    return operationalErrorResponse(
      error,
      "branches.list",
      "BRANCHES_LOAD_FAILED",
      "Không thể tải danh sách chi nhánh."
    )
  }
}
