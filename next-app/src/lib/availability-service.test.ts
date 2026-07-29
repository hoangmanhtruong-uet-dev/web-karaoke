import { describe, expect, it } from "vitest"

import { availabilityWindow } from "@/lib/availability-service"

describe("availability window", () => {
  it("uses Vietnam timezone and crosses midnight correctly", () => {
    const window = availabilityWindow({ date: "2030-07-21", startTime: "23:00", durationHours: 3 })
    expect(window?.startAt.toISOString()).toBe("2030-07-21T16:00:00.000Z")
    expect(window?.endAt.toISOString()).toBe("2030-07-21T19:00:00.000Z")
  })

  it("keeps adjacent ranges non-overlapping via half-open end time", () => {
    const first = availabilityWindow({ date: "2030-07-21", startTime: "22:00", durationHours: 2 })
    const next = availabilityWindow({ date: "2030-07-22", startTime: "00:00", durationHours: 2 })
    expect(first?.endAt).toEqual(next?.startAt)
  })
})
