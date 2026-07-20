import type { BookingStatus } from "@prisma/client"

export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  pending: ["confirmed", "rejected", "cancelled", "expired"],
  confirmed: ["checkedIn", "cancelled"],
  checkedIn: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
}

export function canTransitionBooking(from: BookingStatus, to: BookingStatus) {
  return BOOKING_TRANSITIONS[from].includes(to)
}

export function getBookingTransitionTimestamp(status: BookingStatus, now: Date) {
  switch (status) {
    case "confirmed": return { confirmedAt: now }
    case "cancelled": return { cancelledAt: now }
    case "rejected": return { rejectedAt: now }
    case "checkedIn": return { checkedInAt: now }
    case "expired": return { expiredAt: now }
    default: return {}
  }
}

export function shouldExpireBooking(status: BookingStatus, expiresAt: Date | null, now: Date) {
  return status === "pending" && Boolean(expiresAt && expiresAt <= now)
}
