import { describe, expect, it } from "vitest"

import { BOOKING_STATUS_META, getBookingStatusMeta } from "@/lib/booking-status"

describe("booking status content", () => {
  it("defines customer-facing content for every Prisma booking status", () => {
    expect(Object.keys(BOOKING_STATUS_META)).toEqual([
      "pending", "confirmed", "checkedIn", "completed", "cancelled", "rejected", "expired",
    ])
    for (const meta of Object.values(BOOKING_STATUS_META)) {
      expect(meta.label).toBeTruthy()
      expect(meta.description).toBeTruthy()
      expect(meta.nextStep).toBeTruthy()
      expect(meta.icon).toBeTruthy()
    }
  })

  it("makes pending explicitly non-confirmed", () => {
    const pending = BOOKING_STATUS_META.pending
    expect(pending.label).toContain("chờ xác nhận")
    expect(pending.description).toContain("chỉ được giữ chính thức")
  })

  it("uses a safe fallback for unknown values", () => {
    expect(getBookingStatusMeta("unknown").label).toBe("Trạng thái chưa xác định")
  })
})
