import Link from "next/link"

import { getAdminDashboard } from "@/lib/admin-queries"
import { requireAdminPage } from "@/lib/admin-auth"

export default async function AdminDashboardPage() {
  await requireAdminPage()
  const data = await getAdminDashboard()
  const cards = [
    ["Booking hôm nay", data.today], ["Pending", data.byStatus.pending ?? 0], ["Confirmed", data.byStatus.confirmed ?? 0],
    ["Checked-in", data.byStatus.checkedIn ?? 0], ["Đã đóng", (data.byStatus.cancelled ?? 0) + (data.byStatus.rejected ?? 0) + (data.byStatus.expired ?? 0)],
    ["Liên hệ chưa xử lý", data.contacts], ["Sắp diễn ra", data.upcoming], ["Gần hết giữ chỗ", data.nearExpiry], ["Dead-letter", data.deadLetters],
  ] as const
  return <div><div className="flex items-center justify-between"><div><p className="text-sm text-gold">Dashboard</p><h1 className="font-heading text-3xl font-bold">Tổng quan vận hành</h1></div><Link href="/admin/bookings" className="text-sm text-gold">Xem booking →</Link></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#10131b] p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div></div>
}
