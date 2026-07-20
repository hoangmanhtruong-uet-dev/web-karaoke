import { describe, expect, it } from "vitest"

import { getAvailableRoomTiers, shouldResetRoomTier } from "@/lib/booking-client"
import type { Room } from "@/types"

function room(id: string, branchId: string, tier: Room["tier"], status: Room["status"] = "available"): Room {
  return {
    id,
    branchId,
    name: id,
    slug: id,
    tier,
    capacity: { min: 2, max: 10 },
    hourlyRate: 100_000,
    features: [],
    status,
    imageUrl: "",
  }
}

describe("room tiers by branch", () => {
  const rooms = [
    room("r1", "branch-1", "standard"),
    room("r2", "branch-1", "vip"),
    room("r3", "branch-2", "premium"),
    room("r4", "branch-1", "presidential", "maintenance"),
  ]

  it("returns only available tiers of the selected branch", () => {
    expect(getAvailableRoomTiers(rooms, "branch-1")).toEqual(["standard", "vip"])
  })

  it("resets a tier that is unavailable after changing branch", () => {
    expect(shouldResetRoomTier("vip", getAvailableRoomTiers(rooms, "branch-2"))).toBe(true)
    expect(shouldResetRoomTier("premium", getAvailableRoomTiers(rooms, "branch-2"))).toBe(false)
  })
})
