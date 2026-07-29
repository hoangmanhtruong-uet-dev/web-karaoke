import { NextRequest } from "next/server"

import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { operationalErrorResponse } from "@/lib/operational-error"
import {
  publicBranchesQuerySchema,
  readQueryRecord,
} from "@/lib/public-catalog-query"

export async function GET(request: NextRequest) {
  try {
    const queryRecord = readQueryRecord(new URL(request.url).searchParams)
    if ("error" in queryRecord) {
      return apiError(400, "INVALID_QUERY_PARAMETER", queryRecord.error ?? "Query parameter không hợp lệ.")
    }

    const parsed = publicBranchesQuerySchema.safeParse(queryRecord.record)
    if (!parsed.success) {
      return apiError(400, "INVALID_QUERY_PARAMETER", parsed.error.issues[0]?.message ?? "Query parameter không hợp lệ.")
    }

    const branches = await prisma.branch.findMany({
      where: { status: parsed.data.status },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
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