import { getBookingStatusMeta } from "@/lib/booking-status"

const bookingStatuses = new Set(["pending", "confirmed", "checkedIn", "completed", "cancelled", "rejected", "expired"])

export function StatusBadge({ status }: { status: string }) {
  if (bookingStatuses.has(status)) {
    const meta = getBookingStatusMeta(status)
    return <span title={meta.description} className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold"><span aria-hidden="true">{meta.icon}</span>{meta.label}</span>
  }
  return <span className="inline-flex rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold">{status}</span>
}