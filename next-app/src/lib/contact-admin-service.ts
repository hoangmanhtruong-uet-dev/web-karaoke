import { ContactStatus } from "@prisma/client"

import type { AdminPrincipal } from "@/lib/admin-auth"
import prisma from "@/lib/prisma"

const transitions: Readonly<Record<ContactStatus, readonly ContactStatus[]>> = {
  new: ["inProgress", "resolved", "spam"],
  inProgress: ["new", "resolved", "spam"],
  resolved: ["inProgress"],
  spam: ["new"],
}

export function getContactTransitions(status: ContactStatus) {
  return [...transitions[status]]
}

export function canTransitionContact(from: ContactStatus, to: ContactStatus) {
  return transitions[from].includes(to)
}

export async function transitionContactStatus(id: string, status: ContactStatus, actor: AdminPrincipal) {
  return prisma.$transaction(async (tx) => {
    const contact = await tx.contactRequest.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!contact) return null
    if (!canTransitionContact(contact.status, status)) throw new Error("INVALID_CONTACT_STATUS")
    const updated = await tx.contactRequest.updateMany({ where: { id, status: contact.status }, data: { status } })
    if (updated.count !== 1) throw new Error("CONTACT_CONFLICT")
    await tx.auditLog.create({ data: { actorId: actor.id, actorRole: actor.role, action: "contact.statusChanged", entityType: "contactRequest", entityId: id, oldValue: { status: contact.status }, newValue: { status } } })
    return { id, status }
  })
}
