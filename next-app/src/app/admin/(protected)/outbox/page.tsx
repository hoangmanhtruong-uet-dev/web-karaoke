import { OutboxRetry } from "@/components/admin/outbox-retry"
import { StatusBadge } from "@/components/admin/status-badge"
import { requireAdminPage } from "@/lib/admin-auth"
import prisma from "@/lib/prisma"

export default async function OutboxPage() {
  await requireAdminPage()
  const events = await prisma.outboxEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, eventType: true, aggregateType: true, aggregateId: true, status: true, attemptCount: true, nextAttemptAt: true, lastError: true, createdAt: true } })
  return <div><h1 className="font-heading text-3xl font-bold">Notification outbox</h1><div className="mt-5 grid gap-3">{events.map((event)=><article key={event.id} className="rounded-2xl border border-white/10 bg-[#10131b] p-4"><div className="flex justify-between"><b>{event.eventType}</b><StatusBadge status={event.status}/></div><p className="mt-2 text-xs text-muted-foreground">{event.aggregateType} · attempts {event.attemptCount} · next {event.nextAttemptAt.toLocaleString("vi-VN")}</p>{event.lastError&&<p className="mt-2 text-sm text-rose-200">{event.lastError}</p>}{event.status==="deadLetter"&&<OutboxRetry id={event.id}/>}</article>)}</div></div>
}
