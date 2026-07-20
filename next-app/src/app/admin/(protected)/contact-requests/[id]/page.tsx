import { notFound } from "next/navigation"

import { ContactActions } from "@/components/admin/contact-actions"
import { StatusBadge } from "@/components/admin/status-badge"
import { requireAdminPage } from "@/lib/admin-auth"
import { getContactTransitions } from "@/lib/contact-admin-service"
import prisma from "@/lib/prisma"

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage()
  const { id } = await params
  const contact = await prisma.contactRequest.findUnique({ where: { id }, include: { adminNotes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } })
  if (!contact) notFound()
  return <div><div className="flex justify-between"><h1 className="font-heading text-3xl font-bold">{contact.name}</h1><StatusBadge status={contact.status}/></div><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-white/10 bg-[#10131b] p-5"><p>{contact.phone} · {contact.email ?? "không email"}</p><p className="mt-5 whitespace-pre-wrap text-muted-foreground">{contact.message}</p><h2 className="mt-6 font-semibold">Ghi chú nội bộ</h2>{contact.adminNotes.map((note)=><p key={note.id} className="mt-2 text-sm">{note.content} — {note.author.name}</p>)}</section><ContactActions id={contact.id} allowedStatuses={getContactTransitions(contact.status)}/></div></div>
}
