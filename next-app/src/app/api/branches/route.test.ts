import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const findMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({ default: { branch: { findMany } } }))

import { GET } from "@/app/api/branches/route"

const request = (query = "") => new NextRequest(`http://localhost/api/branches${query}`)

describe("GET /api/branches", () => {
  beforeEach(() => {
    findMany.mockImplementation(({ where }: { where: { status: string } }) => Promise.resolve([
      { id: "active-branch", status: where.status },
    ]))
  })

  it("only queries active branches by default and caps the page size", async () => {
    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "active" }, take: 100 }))
    expect(body.data.branches).toEqual([{ id: "active-branch", status: "active" }])
  })

  it("accepts the active filter and a bounded limit", async () => {
    const response = await GET(request("?status=active&limit=2"))

    expect(response.status).toBe(200)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }))
  })

  it("rejects inactive status and oversized limits without querying", async () => {
    const response = await GET(request("?status=maintenance"))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: "INVALID_QUERY_PARAMETER" }),
    }))
    expect(findMany).not.toHaveBeenCalled()

    const oversized = await GET(request("?limit=101"))
    expect(oversized.status).toBe(400)
  })
})
