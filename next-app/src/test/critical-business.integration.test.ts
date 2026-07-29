import { randomUUID } from "node:crypto"

import { hash } from "bcryptjs"
import { NextRequest } from "next/server"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { PrismaClient } from "@prisma/client"

let prisma: PrismaClient
let authenticateAdmin: typeof import("@/lib/auth-service").authenticateAdmin
let createBooking: typeof import("@/lib/booking-service").createBooking
let hasPermission: typeof import("@/lib/permissions").hasPermission
let lookupBooking: typeof import("@/lib/booking-lookup-service").lookupBooking
let listBranches: typeof import("@/app/api/branches/route").GET

beforeAll(async () => {
  const [
    prismaModule,
    authModule,
    bookingModule,
    permissionModule,
    lookupModule,
    branchRoute,
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auth-service"),
    import("@/lib/booking-service"),
    import("@/lib/permissions"),
    import("@/lib/booking-lookup-service"),
    import("@/app/api/branches/route"),
  ])

  prisma = prismaModule.default
  authenticateAdmin = authModule.authenticateAdmin
  createBooking = bookingModule.createBooking
  hasPermission = permissionModule.hasPermission
  lookupBooking = lookupModule.lookupBooking
  listBranches = branchRoute.GET
})

afterAll(async () => {
  await prisma?.$disconnect()
})

async function createCatalogFixture(token: string) {
  const branch = await prisma.branch.create({
    data: {
      name: `Critical integration ${token}`,
      slug: `critical-integration-${token}`,
      address: "Integration address",
      district: "Integration district",
      city: "Ho Chi Minh City",
      phone: "0900000000",
      email: `critical-${token}@example.test`,
      openingHours: { open: "09:00", close: "23:59" },
      amenities: [],
      status: "active",
    },
  })
  const room = await prisma.room.create({
    data: {
      branchId: branch.id,
      name: "Critical integration room",
      slug: `critical-integration-room-${token}`,
      tier: "standard",
      capacity: { min: 1, max: 10 },
      hourlyRate: 150_000,
      features: [],
      status: "available",
    },
  })
  return { branch, room }
}

async function cleanupCatalogFixture(branchId: string) {
  const bookings = await prisma.booking.findMany({
    where: { branchId },
    select: { id: true },
  })
  const bookingIds = bookings.map(({ id }) => id)
  if (bookingIds.length > 0) {
    await prisma.outboxEvent.deleteMany({
      where: { aggregateType: "booking", aggregateId: { in: bookingIds } },
    })
    await prisma.auditLog.deleteMany({
      where: { entityType: "booking", entityId: { in: bookingIds } },
    })
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } })
  }
  await prisma.room.deleteMany({ where: { branchId } })
  await prisma.branch.deleteMany({ where: { id: branchId } })
}

describe("critical business flows on isolated PostgreSQL", () => {
  it("authenticates an active staff account and applies RBAC", async () => {
    const token = randomUUID()
    const email = `staff-${token}@example.test`
    const password = "IntegrationPassword!2026"
    const user = await prisma.adminUser.create({
      data: {
        email,
        name: "Integration Staff",
        passwordHash: await hash(password, 4),
        role: "staff",
        isActive: true,
      },
    })

    try {
      const principal = await authenticateAdmin({ email, password })
      expect(principal).toMatchObject({ id: user.id, email, role: "staff" })
      expect(hasPermission(principal!.role, "booking.update")).toBe(true)
      expect(hasPermission(principal!.role, "staff.manage")).toBe(false)
      expect(
        await authenticateAdmin({ email, password: "WrongPassword!2026" })
      ).toBeNull()
    } finally {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [{ actorId: user.id }, { entityId: user.id }],
        },
      })
      await prisma.adminUser.delete({ where: { id: user.id } })
    }
  })

  it("creates, replays and looks up one booking while rejecting double-booking", async () => {
    const token = randomUUID()
    const fixture = await createCatalogFixture(token)
    const phone = `090${token.replaceAll("-", "").slice(0, 7)}`
    const input = {
      customerName: "Critical Integration Guest",
      customerPhone: phone,
      branchId: fixture.branch.id,
      roomTier: "standard" as const,
      date: "2035-07-21",
      startTime: "19:00",
      durationHours: 2,
      guestCount: 4,
      selectedMenuIds: [],
      note: "integration",
    }
    const now = new Date("2035-07-20T00:00:00.000Z")
    const idempotencyKey = `critical-integration-${token}`

    try {
      const created = await createBooking(input, idempotencyKey, now)
      const replay = await createBooking(input, idempotencyKey, now)

      expect(created.replayed).toBe(false)
      expect(replay).toMatchObject({
        bookingId: created.bookingId,
        bookingCode: created.bookingCode,
        replayed: true,
      })
      expect(
        await prisma.booking.count({ where: { branchId: fixture.branch.id } })
      ).toBe(1)

      await expect(
        createBooking(input, `critical-overlap-${token}`, now)
      ).rejects.toMatchObject({ code: "ROOM_UNAVAILABLE" })

      const lookup = await lookupBooking(created.bookingCode, phone)
      expect(lookup).toMatchObject({
        code: created.bookingCode,
        branch: fixture.branch.name,
        room: fixture.room.name,
      })
      expect(lookup?.phone).not.toContain(phone)
      expect(await lookupBooking(created.bookingCode, "0911111111")).toBeNull()
    } finally {
      await cleanupCatalogFixture(fixture.branch.id)
    }
  })

  it("public branch API returns active rows and rejects admin-only filters", async () => {
    const token = randomUUID()
    const active = await prisma.branch.create({
      data: {
        name: `Public active ${token}`,
        slug: `public-active-${token}`,
        address: "Integration address",
        district: "Integration district",
        city: "Ho Chi Minh City",
        phone: "0900000000",
        openingHours: {},
        amenities: [],
        status: "active",
      },
    })
    const maintenance = await prisma.branch.create({
      data: {
        name: `Public maintenance ${token}`,
        slug: `public-maintenance-${token}`,
        address: "Integration address",
        district: "Integration district",
        city: "Ho Chi Minh City",
        phone: "0900000000",
        openingHours: {},
        amenities: [],
        status: "maintenance",
      },
    })

    try {
      const response = await listBranches(
        new NextRequest("http://localhost/api/branches?status=active&limit=100")
      )
      const body = await response.json()
      const ids = body.data.branches.map((branch: { id: string }) => branch.id)
      expect(response.status).toBe(200)
      expect(ids).toContain(active.id)
      expect(ids).not.toContain(maintenance.id)

      const rejected = await listBranches(
        new NextRequest("http://localhost/api/branches?status=maintenance")
      )
      expect(rejected.status).toBe(400)
    } finally {
      await prisma.branch.deleteMany({
        where: { id: { in: [active.id, maintenance.id] } },
      })
    }
  })
})
