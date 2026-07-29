import { canonicalizeVietnamPhone } from "@/lib/utils"
import prisma from "@/lib/prisma"

export const BOOKING_LOOKUP_ERROR = "Không tìm thấy thông tin đặt phòng phù hợp."

export function maskLookupPhone(phone: string) {
  const digits = canonicalizeVietnamPhone(phone)
  return digits.length > 4 ? `••••••${digits.slice(-4)}` : "••••"
}

export function maskLookupEmail(email: string | null) {
  if (!email) return null
  const [local, domain] = email.split("@")
  if (!domain) return "••••"
  return `${local.slice(0, 1)}•••@${domain}`
}

export async function lookupBooking(code: string, phone: string) {
  const booking = await prisma.booking.findFirst({
    where: { code: code.trim().toUpperCase(), customerPhone: canonicalizeVietnamPhone(phone) },
    select: {
      code: true, customerPhone: true, customerEmail: true, date: true,
      startTime: true, durationHours: true, status: true, totalAmount: true,
      startAt: true, endAt: true, branch: { select: { name: true } },
      room: { select: { name: true, tier: true } },
    },
  })
  if (!booking) return null
  return {
    code: booking.code,
    branch: booking.branch.name,
    room: booking.room?.name ?? null,
    roomTier: booking.room?.tier ?? null,
    date: booking.date,
    startTime: booking.startTime,
    durationHours: booking.durationHours,
    status: booking.status,
    totalAmount: booking.totalAmount,
    startAt: booking.startAt?.toISOString() ?? null,
    endAt: booking.endAt?.toISOString() ?? null,
    phone: maskLookupPhone(booking.customerPhone),
    email: maskLookupEmail(booking.customerEmail),
    pendingNotice: booking.status === "pending" ? "Booking chưa được xác nhận." : null,
  }
}
