import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const roomFindMany = vi.hoisted(() => vi.fn())
const bookingFindMany = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({ default: { room: { findMany: roomFindMany }, booking: { findMany: bookingFindMany } } }))

import { GET } from "@/app/api/rooms/route"

const request = (query = "") => new NextRequest(`http://localhost/api/rooms${query}`)

describe("GET /api/rooms", () => {
  beforeEach(() => {
    roomFindMany.mockImplementation(({ where }: { where: { status: string } }) => Promise.resolve([
      { id: "available-room", capacity: { max: 10 }, status: where.status },
    ]))
    bookingFindMany.mockResolvedValue([])
  })

  it("only queries available rooms by default", async () => {
    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(roomFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "available" }, take: 100 }))
    expect(body.data.rooms).toEqual([{ id: "available-room", capacity: { max: 10 }, status: "available" }])
  })

  it("accepts valid filters and applies guest capacity", async () => {
    const response = await GET(request("?branchId=branch-1&tier=vip&guestCount=6&limit=5"))

    expect(response.status).toBe(200)
    expect(roomFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "available", branchId: "branch-1", tier: "vip" },
      take: 5,
    }))
  })

  it("rejects unavailable status and incomplete availability filters", async () => {
    const invalidStatus = await GET(request("?status=occupied"))
    expect(invalidStatus.status).toBe(400)
    expect(roomFindMany).not.toHaveBeenCalled()

    const incomplete = await GET(request("?date=2026-08-01"))
    const body = await incomplete.json()
    expect(incomplete.status).toBe(400)
    expect(body.error.code).toBe("INVALID_QUERY_PARAMETER")
  })

  it("filters rooms that conflict with a valid booking window", async () => {
    roomFindMany.mockResolvedValue([
      { id: "free-room", capacity: { max: 10 }, status: "available" },
      { id: "blocked-room", capacity: { max: 10 }, status: "available" },
    ])
    bookingFindMany.mockResolvedValue([{ roomId: "blocked-room" }])

    const response = await GET(request("?date=2026-08-01&startTime=22:00&durationHours=3"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.rooms.map((room: { id: string }) => room.id)).toEqual(["free-room"])
    expect(bookingFindMany).toHaveBeenCalled()
  })
})
