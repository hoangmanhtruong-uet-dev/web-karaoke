import { getBookingStatusMeta } from "@/lib/booking-status"

const toneClasses = {
  warning: "border-amber-300/40 bg-amber-400/15 text-amber-100",
  success: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
  info: "border-sky-300/40 bg-sky-400/15 text-sky-100",
  muted: "border-white/20 bg-white/[0.06] text-muted-foreground",
  danger: "border-rose-300/40 bg-rose-400/15 text-rose-100",
} as const

export function BookingStatusBadge({ status }: { status: string }) {
  const meta = getBookingStatusMeta(status)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[meta.tone]}`}>
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  )
}
