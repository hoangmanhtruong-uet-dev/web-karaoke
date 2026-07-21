import { beforeEach, describe, expect, it, vi } from "vitest"

import type { BookingInput } from "@/lib/booking-domain"

type StoredBooking = {
  id: string
  idempotencyKey: string
  requestHash: string
}

const fakeDatabase = vi.hoisted(() => {
  const bookingsByKey = new Map<string, StoredBooking>()
  let createCount = 0
  let transactionQueue = Promise.resolve()

  const tx = {
    $executeRaw: async () => 1,
    $queryRaw: async () => createCount === 0 ? [{ id: "room-1" }] : [],
    booking: {
      findUnique: async (args: { where: { idempotencyKey: string } }) => {
        return bookingsByKey.get(args.where.idempotencyKey) ?? null
      },
      create: async (args: {
        data: { idempotencyKey: string; requestHash: string }
      }) => {
        createCount += 1
        const booking = {
          id: `booking-${createCount}`,
          idempotencyKey: args.data.idempotencyKey,
          requestHash: args.data.requestHash,
        }
        bookingsByKey.set(booking.idempotencyKey, booking)
        return { id: booking.id }
      },
    },
    branch: {
      findUnique: async () => ({ status: "active" }),
    },
    menuItem: {
      findMany: async () => [],
    },
    customer: {
      upsert: async () => ({ id: "customer-1" }),
    },
    outboxEvent: {
      create: async () => ({ id: "event-1" }),
    },
  }

  return {
    prisma: {
      $transaction: async <Result>(callback: (client: typeof tx) => Promise<Result>) => {
        let release: () => void = () => undefined
        const previous = transactionQueue
        transactionQueue = new Promise<void>((resolve) => {
          release = resolve
        })
        await previous
        try {
          return await callback(tx)
        } finally {
          release()
        }
      },
    },
    reset() {
      bookingsByKey.clear()
      createCount = 0
      transactionQueue = Promise.resolve()
    },
    getCreateCount: () => createCount,
  }
})

vi.mock("@/lib/prisma", () => ({ default: fakeDatabase.prisma }))

import { createBooking } from "@/lib/booking-service"

const input: BookingInput = {
  customerName: "Nguyễn An",
  customerPhone: "0901234567",
  branchId: "branch-1",
  roomTier: "vip",
  date: "2030-07-21",
  startTime: "19:00",
  durationHours: 3,
  guestCount: 8,
  selectedMenuIds: [],
  note: "",
}

describe("booking concurrency and idempotency", () => {
  beforeEach(() => fakeDatabase.reset())

  it("does not create two bookings for one room slot under concurrent requests", async () => {
    const results = await Promise.allSettled([
      createBooking(input, "booking-request-key-0001", new Date("2030-01-01")),
      createBooking(input, "booking-request-key-0002", new Date("2030-01-01")),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect(fakeDatabase.getCreateCount()).toBe(1)
  })

  it("creates once and replays the original booking for the same key", async () => {
    const first = await createBooking(input, "booking-request-key-0001", new Date("2030-01-01"))
    const second = await createBooking(input, "booking-request-key-0001", new Date("2030-01-01"))

    expect(first).toMatchObject({ bookingId: "booking-1", replayed: false })
    expect(second).toMatchObject({ bookingId: "booking-1", replayed: true })
    expect(fakeDatabase.getCreateCount()).toBe(1)
  })

  it("returns a clear conflict when a key is reused with a different payload", async () => {
    await createBooking(input, "booking-request-key-0001", new Date("2030-01-01"))

    await expect(
      createBooking(
        { ...input, guestCount: 9 },
        "booking-request-key-0001",
        new Date("2030-01-01")
      )
    ).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
      status: 409,
    })
    expect(fakeDatabase.getCreateCount()).toBe(1)
  })
})
