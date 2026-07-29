import { NextRequest } from "next/server"

import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { operationalErrorResponse } from "@/lib/operational-error"
import { publicMenuItemsQuerySchema, readQueryRecord } from "@/lib/public-catalog-query"

export async function GET(request: NextRequest) {
  try {
    const queryRecord = readQueryRecord(new URL(request.url).searchParams)
    if ("error" in queryRecord) {
      return apiError(400, "INVALID_QUERY_PARAMETER", queryRecord.error ?? "Query parameter không hợp lệ.")
    }

    const parsed = publicMenuItemsQuerySchema.safeParse(queryRecord.record)
    if (!parsed.success) {
      return apiError(400, "INVALID_QUERY_PARAMETER", parsed.error.issues[0]?.message ?? "Query parameter không hợp lệ.")
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        isAvailable: parsed.data.isAvailable === "true",
        ...(parsed.data.category ? { category: parsed.data.category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        price: true,
        imageUrl: true,
        isSignature: true,
        isAvailable: true,
        createdAt: true,
      },
    })

    return apiSuccess({ menuItems }, 200, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    return operationalErrorResponse(error, "menu-items.list", "MENU_ITEMS_LOAD_FAILED", "Không thể tải danh sách menu.")
  }
}