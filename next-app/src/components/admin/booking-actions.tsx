"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

type RoomOption = { id: string; name: string; tier: string }

export function BookingActions({ bookingId, allowedStatuses, rooms }: { bookingId: string; allowedStatuses: string[]; rooms: RoomOption[] }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function mutate(url: string, body: object) {
    if (pending) return
    setPending(true); setError("")
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const result = await response.json() as { success: boolean; error?: { message?: string } }
    setPending(false)
    if (!response.ok || !result.success) { setError(result.error?.message ?? "Thao tác thất bại."); return }
    router.refresh()
  }

  return <div className="space-y-4 rounded-2xl border border-white/10 bg-[#10131b] p-5"><h2 className="font-heading text-xl font-bold">Thao tác</h2><div className="flex flex-wrap gap-2">{allowedStatuses.map((status)=><Button key={status} disabled={pending} onClick={()=>mutate(`/api/admin/bookings/${bookingId}/transition`, { status })} className="luxury-button-outline">{status}</Button>)}</div><form onSubmit={(event)=>{event.preventDefault(); const data=new FormData(event.currentTarget); void mutate(`/api/admin/bookings/${bookingId}/reassign-room`, { roomId:data.get("roomId"), allowTierChange:data.get("allowTierChange")==="on" })}} className="grid gap-2"><select name="roomId" required className="rounded-xl bg-black/30 px-3 py-2"><option value="">Đổi phòng...</option>{rooms.map((room)=><option key={room.id} value={room.id}>{room.name} · {room.tier}</option>)}</select><label className="text-xs"><input name="allowTierChange" type="checkbox"/> Xác nhận đổi hạng phòng</label><Button type="submit" disabled={pending}>Gán phòng</Button></form><form onSubmit={(event)=>{event.preventDefault(); const data=new FormData(event.currentTarget); void mutate(`/api/admin/bookings/${bookingId}/notes`, { content:data.get("content") }); event.currentTarget.reset()}} className="grid gap-2"><textarea name="content" maxLength={1000} required placeholder="Ghi chú nội bộ" className="rounded-xl bg-black/30 p-3"/><Button type="submit" disabled={pending}>Thêm ghi chú</Button></form>{error&&<p role="alert" className="text-sm text-rose-200">{error}</p>}</div>
}
