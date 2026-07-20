import Link from "next/link"

import { StatusBadge } from "@/components/admin/status-badge"
import { requireAdminPage } from "@/lib/admin-auth"
import { listAdminBookings } from "@/lib/admin-queries"
import prisma from "@/lib/prisma"

type SearchParams = Record<string, string | string[] | undefined>

function pageHref(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value && key !== "page") query.set(key, value)
  query.set("page", String(page))
  return `/admin/bookings?${query}`
}

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage()
  const raw = await searchParams
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))
  const [data, branches, rooms] = await Promise.all([
    listAdminBookings(params),
    prisma.branch.findMany({ where: { status: "active" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ select: { id: true, name: true, branch: { select: { name: true } } }, orderBy: { name: "asc" } }),
  ])

  return <div><h1 className="font-heading text-3xl font-bold">Booking</h1><form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-[#10131b] p-4 sm:grid-cols-2 xl:grid-cols-4"><input name="search" defaultValue={params.search} placeholder="Mã, tên, điện thoại, email..." className="rounded-xl bg-black/30 px-3 py-2"/><select name="status" defaultValue={params.status} className="rounded-xl bg-black/30 px-3 py-2"><option value="">Mọi trạng thái</option>{["pending","confirmed","checkedIn","completed","cancelled","rejected","expired"].map((status)=><option key={status}>{status}</option>)}</select><select name="branchId" defaultValue={params.branchId} className="rounded-xl bg-black/30 px-3 py-2"><option value="">Mọi chi nhánh</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select name="roomId" defaultValue={params.roomId} className="rounded-xl bg-black/30 px-3 py-2"><option value="">Mọi phòng</option>{rooms.map((room)=><option key={room.id} value={room.id}>{room.branch.name} · {room.name}</option>)}</select><select name="tier" defaultValue={params.tier} className="rounded-xl bg-black/30 px-3 py-2"><option value="">Mọi hạng phòng</option>{["standard","vip","premium","presidential"].map((tier)=><option key={tier}>{tier}</option>)}</select><label className="text-xs">Từ ngày<input name="from" type="date" defaultValue={params.from} className="mt-1 block w-full rounded-xl bg-black/30 px-3 py-2"/></label><label className="text-xs">Đến ngày<input name="to" type="date" defaultValue={params.to} className="mt-1 block w-full rounded-xl bg-black/30 px-3 py-2"/></label><select name="sort" defaultValue={params.sort} className="rounded-xl bg-black/30 px-3 py-2"><option value="createdAt">Mới tạo</option><option value="startAt">Giờ bắt đầu</option><option value="status">Trạng thái</option></select><select name="order" defaultValue={params.order} className="rounded-xl bg-black/30 px-3 py-2"><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="expiringSoon" value="true" defaultChecked={params.expiringSoon === "true"}/>Sắp hết giữ chỗ</label><button className="rounded-xl bg-gold px-4 py-2 font-semibold text-black">Lọc</button></form>{data.items.length ? <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-white/5"><tr>{["Mã","Khách","Điện thoại","Chi nhánh / phòng","Hạng","Khung giờ","Trạng thái","Tạo lúc","Hết giữ chỗ"].map((h)=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.items.map((item)=><tr key={item.id} className="border-t border-white/10"><td className="p-3"><Link className="text-gold" href={`/admin/bookings/${item.id}`}>{item.code}</Link></td><td className="p-3">{item.customerName}<br/><span className="text-xs text-muted-foreground">{item.guestCount} khách · {item.source}</span></td><td className="p-3">{item.customerPhone}</td><td className="p-3">{item.branch.name}<br/>{item.room?.name ?? "Chưa gán"}</td><td className="p-3">{item.room?.tier ?? "—"}</td><td className="p-3">{item.startAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "—"}<br/><span className="text-xs text-muted-foreground">đến {item.endAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "—"}</span></td><td className="p-3"><StatusBadge status={item.status}/></td><td className="p-3">{item.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td><td className="p-3">{item.expiresAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "—"}</td></tr>)}</tbody></table></div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted-foreground">Không có booking phù hợp.</div>}<div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Trang {data.page}/{Math.max(1,data.pageCount)} · {data.total} booking</span><div className="flex gap-2">{data.page > 1&&<Link className="rounded-lg border border-white/15 px-3 py-1" href={pageHref(params,data.page-1)}>Trước</Link>}{data.page < data.pageCount&&<Link className="rounded-lg border border-white/15 px-3 py-1" href={pageHref(params,data.page+1)}>Sau</Link>}</div></div></div>
}
