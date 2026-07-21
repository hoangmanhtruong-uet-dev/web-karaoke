import { requireAdminPage } from "@/lib/admin-auth"
import prisma from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"

const unitLabel = { perBooking: "mỗi booking", perHour: "mỗi giờ", perPerson: "mỗi khách", perItem: "mỗi món" } as const

export default async function AdminServicesPage() {
  await requireAdminPage()
  const services = await prisma.service.findMany({ orderBy: [{ isAvailable: "desc" }, { category: "asc" }, { name: "asc" }], include: { _count: { select: { bookings: true } } } })
  return <div><p className="text-sm text-gold">Danh mục vận hành</p><h1 className="mt-1 font-heading text-3xl font-bold">Dịch vụ</h1><p className="mt-2 text-sm">Giá dịch vụ bổ sung ngoài tiền phòng và menu.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services.map((service)=><article key={service.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-gold/10 px-3 py-1 text-xs text-gold">{service.category}</span><span className={`size-2 rounded-full ${service.isAvailable ? "bg-emerald-400" : "bg-rose-400"}`}/></div><h2 className="mt-4 text-lg font-semibold">{service.name}</h2><p className="mt-2 min-h-12 text-sm leading-6">{service.description}</p><p className="mt-4 text-xl font-bold text-gold">{formatCurrency(service.price)}</p><p className="mt-1 text-xs">{unitLabel[service.unit]} · {service._count.bookings} lượt đặt</p></article>)}</div>
  </div>
}
