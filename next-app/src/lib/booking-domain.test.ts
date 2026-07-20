import { describe, expect, it } from "vitest"

import {
  bookingBlocksSlot,
  bookingInputSchema,
  hashBookingRequest,
  intervalsOverlap,
  roomHasCapacity,
  toVietnamBookingWindow,
  validateBookingWindow,
  type BookingConflictRecord,
  type BookingInput,
} from "@/lib/booking-domain"

const validInput: BookingInput = {
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

describe("booking validation", () => {
  it("rejects a missing branch", () => {
    expect(bookingInputSchema.safeParse({ ...validInput, branchId: "" }).success).toBe(false)
  })

  it.each([0, -1])("rejects guestCount %s", (guestCount) => {
    expect(bookingInputSchema.safeParse({ ...validInput, guestCount }).success).toBe(false)
  })

  it.each([0, -1, 13, 1.5])("rejects durationHours %s", (durationHours) => {
    expect(bookingInputSchema.safeParse({ ...validInput, durationHours }).success).toBe(false)
  })

  it("rejects an invalid calendar date", () => {
    expect(toVietnamBookingWindow("2030-02-30", "19:00", 3)).toBeNull()
  })

  it("converts Vietnam local time to UTC and rejects past bookings", () => {
    const window = toVietnamBookingWindow("2030-07-21", "19:00", 3)
    expect(window?.startAt.toISOString()).toBe("2030-07-21T12:00:00.000Z")
    expect(validateBookingWindow(window, new Date("2030-07-21T13:00:00.000Z"))).toContain("tương lai")
  })

  it("rejects a room whose capacity is below the guest count", () => {
    expect(roomHasCapacity({ min: 2, max: 8 }, 9)).toBe(false)
    expect(roomHasCapacity({ min: 2, max: 10 }, 9)).toBe(true)
  })
})

describe("booking overlap", () => {
  const date = (hour: number) => new Date(Date.UTC(2030, 6, 21, hour))

  it.each([
    [10, 12, 10, 12, true, "same range"],
    [10, 12, 11, 13, true, "starts inside"],
    [10, 12, 9, 11, true, "ends inside"],
    [10, 12, 9, 13, true, "covers existing"],
    [10, 14, 11, 12, true, "inside existing"],
    [10, 12, 12, 14, false, "starts at existing end"],
    [12, 14, 10, 12, false, "ends at existing start"],
  ])("handles %s-%s vs %s-%s: %s (%s)", (aStart, aEnd, bStart, bEnd, expected) => {
    expect(intervalsOverlap(date(aStart as number), date(aEnd as number), date(bStart as number), date(bEnd as number))).toBe(expected)
  })

  function record(overrides: Partial<BookingConflictRecord> = {}): BookingConflictRecord {
    return {
      roomId: "room-1",
      branchId: "branch-1",
      status: "confirmed",
      startAt: date(10),
      endAt: date(12),
      ...overrides,
    }
  }

  it("allows the same time in another room", () => {
    expect(bookingBlocksSlot(record(), record({ roomId: "room-2" }))).toBe(false)
  })

  it("allows the same time in another branch", () => {
    expect(bookingBlocksSlot(record(), record({ branchId: "branch-2" }))).toBe(false)
  })

  it("does not let a cancelled booking block the slot", () => {
    expect(bookingBlocksSlot(record({ status: "cancelled" }), record())).toBe(false)
  })

  it("does not let an expired booking block the slot", () => {
    expect(bookingBlocksSlot(record({ status: "expired" }), record())).toBe(false)
  })
})

describe("idempotency request hash", () => {
  it("is stable when menu IDs have a different order", () => {
    const first = { ...validInput, selectedMenuIds: ["menu-2", "menu-1"] }
    const second = { ...validInput, selectedMenuIds: ["menu-1", "menu-2"] }
    expect(hashBookingRequest(first)).toBe(hashBookingRequest(second))
  })

  it("changes when the payload changes", () => {
    expect(hashBookingRequest(validInput)).not.toBe(
      hashBookingRequest({ ...validInput, guestCount: validInput.guestCount + 1 })
    )
  })
})
