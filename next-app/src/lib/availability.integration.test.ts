import { randomUUID } from "node:crypto"
import { afterAll, describe, expect, it } from "vitest"

const { default: prisma } = await import("@/lib/prisma")
const { getAvailability } = await import("@/lib/availability-service")

describe("availability PostgreSQL integration", () => {
  it("excludes an overlapping hold but allows an adjacent slot", async () => {
    const token = randomUUID()
    const branch = await prisma.branch.create({ data: { name: `Availability ${token}`, slug: `availability-${token}`, address: "test", district: "test", city: "HCM", phone: "0900000000", openingHours: {}, amenities: [], status: "active" } })
    const room = await prisma.room.create({ data: { branchId: branch.id, name: "Test room", slug: `availability-room-${token}`, tier: "standard", capacity: { min: 1, max: 10 }, hourlyRate: 100000, features: [], status: "available" } })
    try {
      await prisma.booking.create({ data: { code: `IT-${token.slice(0, 10)}`, branchId: branch.id, roomId: room.id, customerName: "Test", customerPhone: "0900000000", guestCount: 2, date: "2035-07-21", startTime: "19:00", durationHours: 2, startAt: new Date("2035-07-21T12:00:00Z"), endAt: new Date("2035-07-21T14:00:00Z"), status: "pending", idempotencyKey: `availability-${token}` } })
      expect((await getAvailability({ branchId: branch.id, date: "2035-07-21", startTime: "19:30", durationHours: 1, capacity: 2 })).rooms).toHaveLength(0)
      expect((await getAvailability({ branchId: branch.id, date: "2035-07-21", startTime: "21:00", durationHours: 1, capacity: 2 })).rooms).toHaveLength(1)
    } finally {
      await prisma.booking.deleteMany({ where: { branchId: branch.id } })
      await prisma.room.delete({ where: { id: room.id } })
      await prisma.branch.delete({ where: { id: branch.id } })
    }
  })

  it("returns a real end time across midnight", async () => {
    const token = randomUUID()
    const branch = await prisma.branch.create({ data: { name: `Availability ${token}`, slug: `availability-${token}`, address: "test", district: "test", city: "HCM", phone: "0900000000", openingHours: {}, amenities: [], status: "active" } })
    try {
      const result = await getAvailability({ branchId: branch.id, date: "2035-07-21", startTime: "23:00", durationHours: 3, capacity: 2 })
      expect(result.endAt.toISOString()).toBe("2035-07-21T19:00:00.000Z")
    } finally { await prisma.branch.delete({ where: { id: branch.id } }) }
  })
})

afterAll(async () => { await prisma.$disconnect() })
