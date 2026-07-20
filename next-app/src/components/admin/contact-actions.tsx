"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function ContactActions({ id, allowedStatuses }: { id: string; allowedStatuses: string[] }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function mutate(url: string, method: string, body: object) {
    setPending(true)
    setError("")
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const result = await response.json() as { success: boolean; error?: { message?: string } }
    setPending(false)
    if (!response.ok || !result.success) {
      setError(result.error?.message ?? "Thao tác thất bại")
      return
    }
    router.refresh()
  }

  return <div className="space-y-4 rounded-2xl border border-white/10 bg-[#10131b] p-5"><h2 className="font-semibold">Xử lý</h2><div className="flex flex-wrap gap-2">{allowedStatuses.map((status)=><Button key={status} disabled={pending} onClick={()=>mutate(`/api/admin/contact-requests/${id}/status`,"PATCH",{status})}>{status}</Button>)}</div><form onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);void mutate(`/api/admin/contact-requests/${id}/notes`,"POST",{content:data.get("content")});event.currentTarget.reset()}} className="grid gap-2"><textarea name="content" required maxLength={1000} className="rounded-xl bg-black/30 p-3"/><Button disabled={pending}>Thêm ghi chú</Button></form>{error&&<p className="text-rose-200">{error}</p>}</div>
}
