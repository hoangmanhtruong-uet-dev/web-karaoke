import { NextRequest } from "next/server"
import { Prisma, MenuCategory } from "@prisma/client"

import prisma from "@/lib/prisma"
import { apiSuccess } from "@/lib/api-response"
import { operationalErrorResponse } from "@/lib/operational-error"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get("category")
    const isAvailable = url.searchParams.get("isAvailable")

    const where: Prisma.MenuItemWhereInput = {}
    if (
      category &&
      Object.values(MenuCategory).includes(category as MenuCategory)
    ) {
      where.category = category as MenuCategory
    }
    if (isAvailable !== null) {
      where.isAvailable = isAvailable === "true"
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
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
    return operationalErrorResponse(
      error,
      "menu-items.list",
      "MENU_ITEMS_LOAD_FAILED",
      "Không thể tải danh sách menu."
    )
  }
}
