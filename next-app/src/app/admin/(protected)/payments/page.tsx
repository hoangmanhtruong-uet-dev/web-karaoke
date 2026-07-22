import { requirePermissionPage } from "@/lib/admin-auth"
import prisma from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"

export default async function AdminPaymentsPage() {
  await requirePermissionPage("payment.read")
  const [payments, totals] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { booking: { select: { code: true, customerName: true } } } }),
    prisma.payment.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
  ])
  return <div><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-gold">Tài chính</p><h1 className="mt-1 font-heading text-3xl font-bold">Thanh toán</h1></div><div className="rounded-xl border border-gold/20 bg-gold/10 px-4 py-3"><p className="text-xs">Đã thu</p><p className="font-bold text-gold">{formatCurrency(totals._sum.amount ?? 0)}</p></div></div>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-white/5"><tr>{["Booking","Khách hàng","Số tiền","Phương thức","Trạng thái","Mã giao dịch","Thời gian"].map((h)=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{payments.map((payment)=><tr key={payment.id} className="border-t border-white/10"><td className="p-3 font-medium text-gold">{payment.booking.code}</td><td className="p-3">{payment.booking.customerName}</td><td className="p-3 font-semibold">{formatCurrency(payment.amount)}</td><td className="p-3">{payment.method}</td><td className="p-3">{payment.status}</td><td className="p-3">{payment.transactionCode ?? "—"}</td><td className="p-3 text-muted-foreground">{payment.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td></tr>)}</tbody></table></div>
    {!payments.length&&<div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted-foreground">Chưa phát sinh giao dịch.</div>}
  </div>
}
