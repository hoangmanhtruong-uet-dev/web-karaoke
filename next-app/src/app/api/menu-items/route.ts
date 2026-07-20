import { NextRequest } from "next/server"
import { Prisma, MenuCategory } from "@prisma/client"

import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get("category")
    const isAvailable = url.searchParams.get("isAvailable")

    const where: Prisma.MenuItemWhereInput = {}
    if (category && Object.values(MenuCategory).includes(category as MenuCategory)) {
      where.category = category as MenuCategory
    }
    if (isAvailable !== null) {
      where.isAvailable = isAvailable === "true"
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    return apiSuccess({ menuItems })
  } catch {
    return apiError(500, "MENU_ITEMS_LOAD_FAILED", "Không thể tải danh sách menu.")
  }
}
