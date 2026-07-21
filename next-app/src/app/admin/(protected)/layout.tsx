import Link from "next/link"
import {
  BellRing,
  CalendarCheck2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Sparkles,
  UsersRound,
} from "lucide-react"

import { requireAdminPage } from "@/lib/admin-auth"
import { signOut } from "@/auth"

const links = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { label: "Booking", href: "/admin/bookings", icon: CalendarCheck2 },
  { label: "Khách hàng", href: "/admin/customers", icon: UsersRound },
  { label: "Dịch vụ", href: "/admin/services", icon: Sparkles },
  { label: "Thanh toán", href: "/admin/payments", icon: CreditCard },
  { label: "Liên hệ", href: "/admin/contact-requests", icon: MessageSquareText },
  { label: "Thông báo", href: "/admin/outbox", icon: BellRing },
] as const

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage()
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgb(214_180_106/0.12),transparent_28rem),#07080c] p-3 text-foreground sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1500px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-[1.75rem] border border-gold/15 bg-[#0d1017]/95 shadow-2xl lg:sticky lg:top-5 lg:flex lg:min-h-[calc(100vh-2.5rem)] lg:flex-col">
          <div className="border-b border-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">Royal Karaoke</p>
            <h1 className="mt-2 font-heading text-xl font-bold">Operations Console</h1>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgb(52_211_153)]" />
              Hệ thống đang hoạt động
            </div>
          </div>
          <nav className="grid gap-1 p-3">
            {links.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-gold/10 hover:text-gold">
                <Icon className="size-4" />{label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-white/10 p-4">
            <p className="font-semibold">{admin.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{admin.email} · {admin.role}</p>
            <form action={async()=>{"use server";await signOut({redirectTo:"/admin/login"})}}>
              <button className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-rose-300/30 hover:text-rose-200">
                <LogOut className="size-4" />Đăng xuất
              </button>
            </form>
          </div>
        </aside>
        <section className="min-w-0 rounded-[1.75rem] border border-white/8 bg-[#0a0c12]/75 p-4 shadow-2xl sm:p-6 lg:p-8">{children}</section>
      </div>
    </main>
  )
}
