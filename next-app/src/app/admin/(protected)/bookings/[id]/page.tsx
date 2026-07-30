import { notFound } from "next/navigation"

import { BookingActions } from "@/components/admin/booking-actions"
import { StatusBadge } from "@/components/admin/status-badge"
import { BOOKING_TRANSITIONS } from "@/lib/booking-state-machine"
import { getAdminBooking, getBookingAudit } from "@/lib/admin-queries"
import prisma from "@/lib/prisma"
import { requirePermissionPage } from "@/lib/admin-auth"

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermissionPage("booking.read")
  const { id } = await params
  const booking = await getAdminBooking(id, admin)
  if (!booking) notFound()
  const audit = await getBookingAudit(id, admin)
  const rooms = await prisma.room.findMany({ where: { branchId: booking.branchId, status: "available" }, select: { id: true, name: true, tier: true } })
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-gold">{booking.code}</p><h1 className="font-heading text-3xl font-bold">Chi tiết booking</h1></div><StatusBadge status={booking.status}/></div><div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]"><div className="space-y-5"><section className="grid gap-3 rounded-2xl border border-white/10 bg-[#10131b] p-5 sm:grid-cols-2"><p>Khách: <b>{booking.customerName}</b></p><p>Phone: <b>{booking.customerPhone}</b></p><p>Email: {booking.customerEmail??"—"}</p><p>Số khách: {booking.guestCount}</p><p>Chi nhánh: {booking.branch.name}</p><p>Phòng: {booking.room?.name??"Chưa gán"}</p><p>Bắt đầu: {booking.startAt?.toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})??"—"}</p><p>Kết thúc: {booking.endAt?.toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})??"—"}</p><p>Hết giữ chỗ: {booking.expiresAt?.toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})??"—"}</p><p>Nguồn: {booking.source}</p><p className="sm:col-span-2">Ghi chú khách: {booking.note??"—"}</p></section><section className="rounded-2xl border border-white/10 bg-[#10131b] p-5"><h2 className="font-semibold">Timeline & audit</h2><div className="mt-3 space-y-3">{audit.map((item)=><div key={item.id} className="border-l border-gold/30 pl-3 text-sm"><p>{item.action}</p><p className="text-xs text-muted-foreground">{item.actor?.name??"System"} · {item.createdAt.toLocaleString("vi-VN")}</p></div>)}</div></section><section className="rounded-2xl border border-white/10 bg-[#10131b] p-5"><h2 className="font-semibold">Notification history</h2>{booking.notificationDeliveries.map((delivery)=><p key={delivery.id} className="mt-2 text-sm">{delivery.template} · {delivery.channel} · {delivery.recipientMasked} · {delivery.status}</p>)}</section><section className="rounded-2xl border border-white/10 bg-[#10131b] p-5"><h2 className="font-semibold">Ghi chú nội bộ</h2>{booking.adminNotes.map((note)=><p key={note.id} className="mt-2 text-sm">{note.content} <span className="text-xs text-muted-foreground">— {note.author.name}</span></p>)}</section></div><BookingActions bookingId={booking.id} allowedStatuses={[...BOOKING_TRANSITIONS[booking.status]]} rooms={rooms}/></div></div>
}
