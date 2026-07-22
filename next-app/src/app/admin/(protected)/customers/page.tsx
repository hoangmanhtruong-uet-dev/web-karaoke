import { requirePermissionPage } from "@/lib/admin-auth"
import { maskPhone } from "@/lib/admin-queries"
import prisma from "@/lib/prisma"

const tierLabel = { regular: "Thường", silver: "Bạc", gold: "Vàng", diamond: "Kim cương" } as const

export default async function AdminCustomersPage() {
  await requirePermissionPage("customer.read")
  const customers = await prisma.customer.findMany({ orderBy: { updatedAt: "desc" }, take: 100, include: { _count: { select: { bookings: true } } } })
  return <div><p className="text-sm text-gold">CRM</p><h1 className="mt-1 font-heading text-3xl font-bold">Khách hàng</h1><p className="mt-2 text-sm">Hồ sơ được tự động cập nhật khi khách đặt phòng.</p>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-white/5"><tr>{["Khách hàng","Điện thoại","Hạng","Điểm","Booking","Trạng thái","Cập nhật"].map((h)=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{customers.map((customer)=><tr key={customer.id} className="border-t border-white/10"><td className="p-3 font-medium">{customer.fullName}<br/><span className="text-xs text-muted-foreground">{customer.email ?? "Chưa có email"}</span></td><td className="p-3">{maskPhone(customer.phone)}</td><td className="p-3">{tierLabel[customer.membershipTier]}</td><td className="p-3">{customer.loyaltyPoints}</td><td className="p-3">{customer._count.bookings}</td><td className="p-3">{customer.status === "active" ? "Đang hoạt động" : "Đã chặn"}</td><td className="p-3 text-muted-foreground">{customer.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td></tr>)}</tbody></table></div>
    {!customers.length&&<div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted-foreground">Chưa có hồ sơ khách hàng.</div>}
  </div>
}
