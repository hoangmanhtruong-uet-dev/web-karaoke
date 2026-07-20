import Link from "next/link"

import { requireAdminPage } from "@/lib/admin-auth"
import { signOut } from "@/auth"

const links = [
  ["Tổng quan", "/admin"],
  ["Booking", "/admin/bookings"],
  ["Liên hệ", "/admin/contact-requests"],
  ["Thông báo", "/admin/outbox"],
] as const

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage()
  return (
    <main className="min-h-screen bg-[#07080c] px-4 pb-20 pt-28 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-white/10 bg-[#10131b] p-4 lg:sticky lg:top-24">
          <p className="font-semibold">{admin.name}</p><p className="text-xs text-muted-foreground">{admin.role}</p>
          <nav className="mt-5 grid gap-2">{links.map(([label, href]) => <Link key={href} href={href} className="rounded-xl px-3 py-2 text-sm hover:bg-gold/10 hover:text-gold">{label}</Link>)}</nav>
          <form action={async()=>{"use server";await signOut({redirectTo:"/admin/login"})}}><button className="mt-5 w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-muted-foreground">Đăng xuất</button></form>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  )
}
