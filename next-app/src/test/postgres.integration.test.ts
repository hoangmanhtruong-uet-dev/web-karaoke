import { randomUUID } from "node:crypto"

import type { Prisma, PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required for PostgreSQL integration tests"
  )
}

const productionNamePattern = /(^|[-_.])(prod|production)([-_.]|$)/i
const managedProductionHostPattern = /(?:^|\.)(?:aivencloud\.com|render\.com)$/i
const localHostnames = new Set(["localhost", "127.0.0.1", "::1"])
const originalDatabaseUrl = process.env.DATABASE_URL

function parseDatabaseUrl(value: string, label: string) {
  try {
    return new URL(value)
  } catch {
    throw new Error(`${label} must be a valid URL`)
  }
}

const parsedTestDatabaseUrl = parseDatabaseUrl(
  testDatabaseUrl,
  "TEST_DATABASE_URL"
)
const databaseName = decodeURIComponent(
  parsedTestDatabaseUrl.pathname.replace(/^\//, "")
)
const testHostname = parsedTestDatabaseUrl.hostname.toLowerCase()

if (!["postgres:", "postgresql:"].includes(parsedTestDatabaseUrl.protocol)) {
  throw new Error("TEST_DATABASE_URL must use the PostgreSQL protocol")
}
if (!/(^|[-_])(ci|test)([-_]|$)/i.test(databaseName)) {
  throw new Error(
    "TEST_DATABASE_URL must point to an isolated database whose name contains test or ci"
  )
}
if (
  productionNamePattern.test(databaseName) ||
  productionNamePattern.test(testHostname) ||
  managedProductionHostPattern.test(testHostname)
) {
  throw new Error("TEST_DATABASE_URL must not point to a production target")
}
if (
  !localHostnames.has(testHostname) &&
  process.env.ALLOW_REMOTE_TEST_DATABASE !== "true"
) {
  throw new Error(
    "Remote TEST_DATABASE_URL targets require ALLOW_REMOTE_TEST_DATABASE=true"
  )
}
if (originalDatabaseUrl) {
  const parsedDatabaseUrl = parseDatabaseUrl(
    originalDatabaseUrl,
    "DATABASE_URL"
  )
  const target = (url: URL) =>
    `${url.hostname.toLowerCase()}:${url.port || "5432"}${decodeURIComponent(url.pathname)}`

  if (target(parsedDatabaseUrl) === target(parsedTestDatabaseUrl)) {
    throw new Error("TEST_DATABASE_URL must be isolated from DATABASE_URL")
  }
}

process.env.DATABASE_URL = testDatabaseUrl

let prisma: PrismaClient
let consumeRateLimit: typeof import("@/lib/rate-limit").consumeRateLimit
let clearRateLimit: typeof import("@/lib/rate-limit").clearRateLimit
let transitionBooking: typeof import("@/lib/admin-booking-service").transitionBooking
let reassignBookingRoom: typeof import("@/lib/admin-booking-service").reassignBookingRoom
let expireDueBookings: typeof import("@/lib/booking-jobs").expireDueBookings
let processOutbox: typeof import("@/lib/outbox-worker").processOutbox

beforeAll(async () => {
  const [
    prismaModule,
    limiterModule,
    adminBookingModule,
    jobsModule,
    outboxModule,
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/rate-limit"),
    import("@/lib/admin-booking-service"),
    import("@/lib/booking-jobs"),
    import("@/lib/outbox-worker"),
  ])

  prisma = prismaModule.default
  consumeRateLimit = limiterModule.consumeRateLimit
  clearRateLimit = limiterModule.clearRateLimit
  transitionBooking = adminBookingModule.transitionBooking
  reassignBookingRoom = adminBookingModule.reassignBookingRoom
  expireDueBookings = jobsModule.expireDueBookings
  processOutbox = outboxModule.processOutbox
})

afterAll(async () => {
  await prisma?.$disconnect()
})

async function createBookingFixture(roomCount: number) {
  const token = randomUUID()
  const branch = await prisma.branch.create({
    data: {
      name: `Security integration ${token}`,
      slug: `security-integration-${token}`,
      address: "Integration address",
      district: "Integration district",
      city: "Integration city",
      phone: "0900000000",
      email: `integration-${token}@example.test`,
      openingHours: { open: "09:00", close: "23:00" },
      amenities: [],
      status: "active",
    },
  })
  const rooms = []
  for (let index = 0; index < roomCount; index += 1) {
    rooms.push(
      await prisma.room.create({
        data: {
          branchId: branch.id,
          name: `Integration room ${index}`,
          slug: `security-integration-room-${token}-${index}`,
          tier: "standard",
          capacity: { min: 1, max: 20 },
          hourlyRate: 100_000,
          features: [],
          status: "available",
        },
      })
    )
  }
  return { branch, rooms, token }
}

function bookingData(input: {
  id?: string
  branchId: string
  roomId: string
  token: string
  suffix: string
  startAt?: Date
  endAt?: Date
  expiresAt?: Date | null
}): Prisma.BookingUncheckedCreateInput {
  const startAt = input.startAt ?? new Date("2035-07-21T12:00:00.000Z")
  const endAt = input.endAt ?? new Date("2035-07-21T15:00:00.000Z")
  return {
    ...(input.id ? { id: input.id } : {}),
    code: `IT-${randomUUID().replaceAll("-", "").slice(0, 16)}`,
    branchId: input.branchId,
    roomId: input.roomId,
    customerName: "Integration Guest",
    customerPhone: `090${input.token.replaceAll("-", "").slice(0, 7)}`,
    guestCount: 4,
    date: "2035-07-21",
    startTime: "19:00",
    durationHours: 3,
    startAt,
    endAt,
    status: "pending",
    expiresAt:
      input.expiresAt === undefined
        ? new Date("2035-07-21T11:55:00.000Z")
        : input.expiresAt,
    idempotencyKey: `integration:${input.token}:${input.suffix}`,
    requestHash: "a".repeat(64),
  }
}

async function cleanupBookingFixture(branchId: string, actorId?: string) {
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
  if (actorId) await prisma.adminUser.deleteMany({ where: { id: actorId } })
}

describe("PostgreSQL production invariants", () => {
  it("has the security hardening migration applied", async () => {
    const rows = await prisma.$queryRaw<
      Array<{
        migration_name: string
        finished_at: Date | null
        rolled_back_at: Date | null
      }>
    >`SELECT migration_name, finished_at, rolled_back_at
       FROM "_prisma_migrations"
       WHERE migration_name = '20260722000100_security_hardening'`

    expect(rows).toHaveLength(1)
    expect(rows[0]?.finished_at).toBeInstanceOf(Date)
    expect(rows[0]?.rolled_back_at).toBeNull()
  })

  it("atomically enforces the shared rate limit under concurrency", async () => {
    const rule = {
      scope: `integration-rate-${randomUUID()}`,
      identifier: "same-client",
      limit: 5,
      windowMs: 15 * 60_000,
      blockMs: 15 * 60_000,
    }
    const now = new Date("2035-07-21T10:00:00.000Z")

    try {
      const decisions = await Promise.all(
        Array.from({ length: 20 }, () => consumeRateLimit(rule, now))
      )

      expect(decisions.filter(({ allowed }) => allowed)).toHaveLength(5)
      expect(decisions.filter(({ newlyBlocked }) => newlyBlocked)).toHaveLength(
        1
      )
      expect(decisions.filter(({ allowed }) => !allowed)).toHaveLength(15)
    } finally {
      await clearRateLimit([rule])
    }
  })

  it("allows only one concurrent overlapping booking for the same room", async () => {
    const fixture = await createBookingFixture(1)

    try {
      const results = await Promise.allSettled([
        prisma.booking.create({
          data: bookingData({
            branchId: fixture.branch.id,
            roomId: fixture.rooms[0].id,
            token: fixture.token,
            suffix: "overlap-a",
          }),
        }),
        prisma.booking.create({
          data: bookingData({
            branchId: fixture.branch.id,
            roomId: fixture.rooms[0].id,
            token: fixture.token,
            suffix: "overlap-b",
          }),
        }),
      ])

      expect(
        results.filter(({ status }) => status === "fulfilled")
      ).toHaveLength(1)
      expect(
        results.filter(({ status }) => status === "rejected")
      ).toHaveLength(1)
      expect(
        await prisma.booking.count({ where: { branchId: fixture.branch.id } })
      ).toBe(1)
    } finally {
      await cleanupBookingFixture(fixture.branch.id)
    }
  })

  it("allows only one overlapping room reassignment winner", async () => {
    const fixture = await createBookingFixture(3)
    const actor = await prisma.adminUser.create({
      data: {
        email: `integration-admin-${fixture.token}@example.test`,
        name: "Integration Admin",
        passwordHash: "integration-test-hash",
        role: "admin",
        isActive: true,
      },
    })

    try {
      const first = await prisma.booking.create({
        data: bookingData({
          branchId: fixture.branch.id,
          roomId: fixture.rooms[0].id,
          token: fixture.token,
          suffix: "reassign-a",
        }),
      })
      const second = await prisma.booking.create({
        data: bookingData({
          branchId: fixture.branch.id,
          roomId: fixture.rooms[1].id,
          token: fixture.token,
          suffix: "reassign-b",
        }),
      })
      const principal = {
        id: actor.id,
        email: actor.email,
        name: actor.name,
        role: "admin" as const,
        mustChangePassword: false,
      }

      const results = await Promise.allSettled([
        reassignBookingRoom({
          bookingId: first.id,
          roomId: fixture.rooms[2].id,
          allowTierChange: false,
          actor: principal,
        }),
        reassignBookingRoom({
          bookingId: second.id,
          roomId: fixture.rooms[2].id,
          allowTierChange: false,
          actor: principal,
        }),
      ])

      expect(
        results.filter(({ status }) => status === "fulfilled")
      ).toHaveLength(1)
      expect(
        results.filter(({ status }) => status === "rejected")
      ).toHaveLength(1)
      expect(
        await prisma.booking.count({ where: { roomId: fixture.rooms[2].id } })
      ).toBe(1)
    } finally {
      await cleanupBookingFixture(fixture.branch.id, actor.id)
    }
  })

  it("keeps confirm-versus-expire as a single state transition", async () => {
    const fixture = await createBookingFixture(1)
    const base = new Date("2035-07-21T10:00:00.000Z")
    const booking = await prisma.booking.create({
      data: bookingData({
        branchId: fixture.branch.id,
        roomId: fixture.rooms[0].id,
        token: fixture.token,
        suffix: "state-race",
        expiresAt: new Date(base.getTime() + 60_000),
      }),
    })

    try {
      await Promise.allSettled([
        transitionBooking(
          booking.id,
          "confirmed",
          { id: null, role: "system" },
          base
        ),
        expireDueBookings(new Date(base.getTime() + 120_000), 10),
      ])

      const current = await prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { status: true, confirmedAt: true, expiredAt: true },
      })
      expect(["confirmed", "expired"]).toContain(current.status)
      expect(
        Number(Boolean(current.confirmedAt)) +
          Number(Boolean(current.expiredAt))
      ).toBe(1)

      const auditCount = await prisma.auditLog.count({
        where: {
          entityType: "booking",
          entityId: booking.id,
          action: { in: ["booking.confirmed", "booking.expired"] },
        },
      })
      expect(auditCount).toBe(1)
    } finally {
      await cleanupBookingFixture(fixture.branch.id)
    }
  })

  it("lets only one worker claim and deliver an outbox event", async () => {
    const token = randomUUID()
    const contact = await prisma.contactRequest.create({
      data: {
        name: "Integration Contact",
        phone: "0900000000",
        email: `contact-${token}@example.test`,
        message: "Integration outbox test",
      },
    })
    const event = await prisma.outboxEvent.create({
      data: {
        eventType: "contactRequestCreated",
        aggregateType: "contactRequest",
        aggregateId: contact.id,
        payload: { aggregateId: contact.id },
        idempotencyKey: `integration:${token}:outbox`,
      },
    })
    const previousProvider = process.env.EMAIL_PROVIDER
    const previousRecipient = process.env.ADMIN_NOTIFICATION_EMAIL
    process.env.EMAIL_PROVIDER = "console"
    process.env.ADMIN_NOTIFICATION_EMAIL = "security@example.test"
    const consoleSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined)

    try {
      const results = await Promise.all([
        processOutbox(new Date("2035-07-21T10:00:00.000Z"), 1),
        processOutbox(new Date("2035-07-21T10:00:00.000Z"), 1),
      ])

      expect(results.reduce((total, result) => total + result.claimed, 0)).toBe(
        1
      )
      expect(
        results.reduce((total, result) => total + result.processed, 0)
      ).toBe(1)
      expect(
        await prisma.notificationDelivery.count({
          where: { outboxEventId: event.id },
        })
      ).toBe(1)
      expect(
        await prisma.outboxEvent.findUnique({
          where: { id: event.id },
          select: { status: true },
        })
      ).toEqual({ status: "processed" })
    } finally {
      consoleSpy.mockRestore()
      if (previousProvider === undefined) delete process.env.EMAIL_PROVIDER
      else process.env.EMAIL_PROVIDER = previousProvider
      if (previousRecipient === undefined)
        delete process.env.ADMIN_NOTIFICATION_EMAIL
      else process.env.ADMIN_NOTIFICATION_EMAIL = previousRecipient
      await prisma.outboxEvent.deleteMany({ where: { id: event.id } })
      await prisma.contactRequest.deleteMany({ where: { id: contact.id } })
    }
  })

  it("rolls back booking and outbox writes atomically", async () => {
    const fixture = await createBookingFixture(1)
    const bookingId = randomUUID()
    const idempotencyKey = `integration:${fixture.token}:rollback`

    try {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.booking.create({
            data: bookingData({
              id: bookingId,
              branchId: fixture.branch.id,
              roomId: fixture.rooms[0].id,
              token: fixture.token,
              suffix: "rollback",
            }),
          })
          await tx.outboxEvent.create({
            data: {
              eventType: "bookingCreated",
              aggregateType: "booking",
              aggregateId: bookingId,
              payload: { aggregateId: bookingId },
              idempotencyKey,
            },
          })
          throw new Error("force rollback")
        })
      ).rejects.toThrow("force rollback")

      expect(await prisma.booking.count({ where: { id: bookingId } })).toBe(0)
      expect(
        await prisma.outboxEvent.count({ where: { idempotencyKey } })
      ).toBe(0)
    } finally {
      await cleanupBookingFixture(fixture.branch.id)
    }
  })

  it("persists one contact row for concurrent retries with one idempotency key", async () => {
    const { createContactRequest } = await import("@/lib/contact-service")
    const token = randomUUID()
    const idempotencyKey = `integration-contact-${token}`
    const input = {
      name: "Integration Contact",
      phone: `091${token.replaceAll("-", "").slice(0, 7)}`,
      email: `contact-${token}@example.test`,
      message: "Concurrent idempotency integration test",
    }

    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          createContactRequest(input, idempotencyKey, false)
        )
      )
      expect(new Set(results.map((result) => result.id)).size).toBe(1)
      expect(results.filter((result) => !result.replayed)).toHaveLength(1)
      expect(
        await prisma.contactRequest.count({ where: { idempotencyKey } })
      ).toBe(1)

      await expect(
        createContactRequest(
          { ...input, message: "Conflicting payload" },
          idempotencyKey,
          false
        )
      ).rejects.toMatchObject({
        status: 409,
        code: "IDEMPOTENCY_KEY_REUSED",
      })
    } finally {
      await prisma.contactRequest.deleteMany({ where: { idempotencyKey } })
    }
  })
})
