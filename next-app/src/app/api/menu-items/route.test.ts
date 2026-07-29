import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const findMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({ default: { menuItem: { findMany } } }))

import { GET } from "@/app/api/menu-items/route"

const request = (query = "") => new NextRequest(`http://localhost/api/menu-items${query}`)

describe("GET /api/menu-items", () => {
  beforeEach(() => {
    findMany.mockImplementation(({ where }: { where: { isAvailable: boolean } }) => Promise.resolve([
      { id: "available-item", isAvailable: where.isAvailable },
    ]))
  })

  it("only queries available menu items by default", async () => {
    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isAvailable: true }, take: 100 }))
    expect(body.data.menuItems).toEqual([{ id: "available-item", isAvailable: true }])
  })

  it("accepts a valid category filter", async () => {
    const response = await GET(request("?category=drink&isAvailable=true&limit=5"))

    expect(response.status).toBe(200)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isAvailable: true, category: "drink" },
      take: 5,
    }))
  })

  it("rejects unavailable filters and invalid categories", async () => {
    const unavailable = await GET(request("?isAvailable=false"))
    const body = await unavailable.json()
    expect(unavailable.status).toBe(400)
    expect(body.error.code).toBe("INVALID_QUERY_PARAMETER")
    expect(findMany).not.toHaveBeenCalled()

    const invalidCategory = await GET(request("?category=not-a-category"))
    expect(invalidCategory.status).toBe(400)
  })
})
