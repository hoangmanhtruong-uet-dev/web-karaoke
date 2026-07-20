import Link from "next/link"

import { StatusBadge } from "@/components/admin/status-badge"
import { requireAdminPage } from "@/lib/admin-auth"
import { listAdminContacts } from "@/lib/admin-queries"

function pageHref(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value && key !== "page") query.set(key, value)
  query.set("page", String(page))
  return `/admin/contact-requests?${query}`
}

export default async function ContactRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage()
  const params = await searchParams
  const data = await listAdminContacts(params)
  return <div><h1 className="font-heading text-3xl font-bold">Yêu cầu liên hệ</h1><form className="mt-5 flex flex-wrap gap-3"><input name="search" defaultValue={params.search} placeholder="Tên, phone, email" className="rounded-xl bg-[#10131b] px-3 py-2"/><select name="status" defaultValue={params.status} className="rounded-xl bg-[#10131b] px-3 py-2"><option value="">Mọi trạng thái</option>{["new","inProgress","resolved","spam"].map((status)=><option key={status}>{status}</option>)}</select><button className="rounded-xl bg-gold px-4 py-2 text-black">Lọc</button></form><div className="mt-5 grid gap-4">{data.items.map((item)=><article key={item.id} className="rounded-2xl border border-white/10 bg-[#10131b] p-5"><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{item.name}</h2><p className="text-xs text-muted-foreground">{item.phone} · {item.email ?? "không email"}</p></div><StatusBadge status={item.status}/></div><p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{item.message}</p><Link href={`/admin/contact-requests/${item.id}`} className="mt-3 inline-block text-sm text-gold">Xem chi tiết →</Link></article>)}</div>{!data.items.length && <div className="mt-5 rounded-2xl border border-dashed p-10 text-center">Không có yêu cầu.</div>}<div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Trang {data.page}/{Math.max(1,data.pageCount)} · {data.total} yêu cầu</span><div className="flex gap-2">{data.page > 1&&<Link className="rounded-lg border border-white/15 px-3 py-1" href={pageHref(params,data.page-1)}>Trước</Link>}{data.page < data.pageCount&&<Link className="rounded-lg border border-white/15 px-3 py-1" href={pageHref(params,data.page+1)}>Sau</Link>}</div></div></div>
}
