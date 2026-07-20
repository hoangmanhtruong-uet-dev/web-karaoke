import type { Room, RoomTier } from "@/types"

export function getAvailableRoomTiers(rooms: Room[], branchId: string): RoomTier[] {
  if (!branchId) return []

  return Array.from(
    new Set(
      rooms
        .filter((room) => room.branchId === branchId && room.status === "available")
        .map((room) => room.tier)
    )
  )
}

export function shouldResetRoomTier(
  selectedTier: "" | RoomTier,
  availableTiers: RoomTier[]
) {
  return Boolean(selectedTier && !availableTiers.includes(selectedTier))
}
