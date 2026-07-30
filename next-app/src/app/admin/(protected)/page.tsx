import Link from "next/link"
import { AlertTriangle, CalendarClock, CheckCircle2, DoorOpen, UsersRound, WalletCards } from "lucide-react"

import { requirePermissionPage } from "@/lib/admin-auth"
import { getAdminDashboard } from "@/lib/admin-queries"
import { formatCurrency } from "@/lib/utils"
import { BOOKING_STATUS_META } from "@/lib/booking-status"

export default async function AdminDashboardPage() {
  const admin = await requirePermissionPage("dashboard.read")
  const data = await getAdminDashboard(admin)
  const cards = [
    { label: "Booking hôm nay", value: data.today, icon: CalendarClock, tone: "text-sky-200 bg-sky-400/10" },
    { label: "Sắp diễn ra (24h)", value: data.upcoming, icon: CheckCircle2, tone: "text-emerald-200 bg-emerald-400/10" },
    { label: "Khách hàng", value: data.customers, icon: UsersRound, tone: "text-violet-200 bg-violet-400/10" },
    { label: "Phòng khả dụng", value: data.availableRooms, icon: DoorOpen, tone: "text-gold bg-gold/10" },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold">Xin chào, {admin.name}</p>
          <h2 className="mt-1 font-heading text-3xl font-bold sm:text-4xl">Trung tâm điều hành</h2>
          <p className="mt-2 text-sm">Theo dõi booking, phòng, khách hàng và doanh thu tại một nơi.</p>
        </div>
        <Link href="/admin/bookings?status=pending" className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-black">Xử lý booking chờ</Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></div>
            <p className="mt-5 text-sm">{label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Trạng thái booking</h3><span className="text-xs text-muted-foreground">Toàn thời gian</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {
            Object.entries(BOOKING_STATUS_META).map(([status, meta]) => [meta.label, data.byStatus[status] ?? 0]).map(([label, value]) => <div key={label} className="rounded-xl bg-black/25 p-4"><p className="text-xs">{label}</p><p className="mt-1 text-xl font-bold text-foreground">{value}</p></div>)}
          </div>
        </section>

        <section className="rounded-2xl border border-gold/15 bg-gold/[0.045] p-5">
          <div className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold"><WalletCards className="size-5" /></div>
          <p className="mt-5 text-sm">Doanh thu đã ghi nhận</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(data.revenue)}</p>
          <p className="mt-4 text-xs">{data.activeBranches} chi nhánh đang hoạt động</p>
        </section>
      </div>

      {(data.nearExpiry > 0 || (data.contacts ?? 0) > 0 || (data.deadLetters ?? 0) > 0) && (
        <section className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-5">
          <div className="flex items-center gap-2 text-amber-200"><AlertTriangle className="size-5" /><h3 className="font-semibold">Cần chú ý</h3></div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <p>{data.nearExpiry} booking gần hết giữ chỗ</p>{data.contacts !== null && <p>{data.contacts} liên hệ chưa xử lý</p>}{data.deadLetters !== null && <p>{data.deadLetters} thông báo gửi lỗi</p>}
          </div>
        </section>
      )}
    </div>
  )
}
