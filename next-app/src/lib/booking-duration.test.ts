import { describe, expect, it } from "vitest"

import {
  BOOKING_DURATION_OPTIONS,
  DEFAULT_DURATION_HOURS,
  formatBookingTime,
  getBookingEndTime,
  isValidDurationHours,
} from "@/lib/booking-duration"

describe("booking duration", () => {
  it("exposes the 1, 3 and 12 hour choices", () => {
    expect(BOOKING_DURATION_OPTIONS.map((option) => option.value)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1)
    )
    expect(DEFAULT_DURATION_HOURS).toBe(3)
  })

  it.each([1, 3, 12])("accepts %s hours", (duration) => {
    expect(isValidDurationHours(duration)).toBe(true)
  })

  it.each([0, 13, 1.5, Number.NaN])("rejects %s hours", (duration) => {
    expect(isValidDurationHours(duration)).toBe(false)
  })

  it("calculates an end time on the next date", () => {
    const end = getBookingEndTime("2030-07-21", "22:00", 3)

    expect(end).toEqual({ date: "2030-07-22", time: "01:00" })
    expect(formatBookingTime(end)).toBe("01:00 · 22/07/2030")
  })
})
