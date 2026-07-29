"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge"
import { getBookingStatusMeta } from "@/lib/booking-status"
import type { ApiResponse } from "@/lib/api-response"

type BookingLookup = {
  code: string; branch: string; room: string | null; roomTier: string | null
  date: string; startTime: string; durationHours: number; status: string
  totalAmount: number | null; phone: string; email: string | null; pendingNotice: string | null
}

export default function BookingLookupPage() {
  const [code, setCode] = useState(""); const [phone, setPhone] = useState("")
  const [booking, setBooking] = useState<BookingLookup | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setBooking(null)
    try {
      const response = await fetch(`/api/booking/lookup?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`)
      const result = await response.json() as ApiResponse<{ booking: BookingLookup }>
      if (!response.ok || !result.success) throw new Error("Không tìm thấy thông tin đặt phòng phù hợp.")
      setBooking(result.data.booking)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tìm thấy thông tin đặt phòng phù hợp.") }
    finally { setLoading(false) }
  }
  return <main className="min-h-screen bg-[#07080c] px-4 pb-24 pt-32 text-foreground"><div className="mx-auto max-w-xl">
    <p className="text-sm uppercase tracking-[0.25em] text-gold">Tra cứu booking</p><h1 className="mt-3 font-heading text-4xl font-bold">Xem thông tin đặt phòng</h1><p className="mt-3 text-muted-foreground">Nhập cả mã booking và số điện thoại đã đặt để xác thực.</p>
    <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5"><label className="block text-sm">Mã booking<input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="RK-ABC123" className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#07080c] px-4" /></label><label className="block text-sm">Số điện thoại đã đặt<input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901 234 567" className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#07080c] px-4" /></label><Button type="submit" disabled={loading} className="luxury-button h-12 w-full rounded-full">{loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Đang tra cứu...</> : <><Search className="mr-2 size-4" />Tra cứu</>}</Button>{error && <p role="alert" className="text-sm text-rose-200">{error}</p>}</form>
    {booking && <section aria-live="polite" className="mt-6 rounded-3xl border border-gold/20 bg-gold/5 p-5"><h2 className="font-heading text-2xl font-bold">{booking.code}</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Chi nhánh</dt><dd>{booking.branch}</dd></div><div><dt className="text-muted-foreground">Phòng / hạng</dt><dd>{booking.room ?? booking.roomTier ?? "Nhân viên tư vấn"}</dd></div><div><dt className="text-muted-foreground">Ngày và giờ</dt><dd>{booking.date} · {booking.startTime}</dd></div><div><dt className="text-muted-foreground">Thời lượng</dt><dd>{booking.durationHours} giờ</dd></div><div><dt className="text-muted-foreground">Trạng thái</dt><dd><BookingStatusBadge status={booking.status} /></dd></div><div><dt className="text-muted-foreground">Liên hệ</dt><dd>{booking.phone}{booking.email ? ` · ${booking.email}` : ""}</dd></div></dl>{booking.totalAmount !== null && <p className="mt-4 text-sm">Giá dự kiến: {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(booking.totalAmount)}</p>}<p className="mt-4 text-sm text-muted-foreground">{getBookingStatusMeta(booking.status).description}</p><p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Bước tiếp theo:</span> {getBookingStatusMeta(booking.status).nextStep}</p></section>}
    <Link href="/booking" className="mt-6 inline-block text-sm text-gold">← Quay lại đặt phòng</Link>
  </div></main>
}
