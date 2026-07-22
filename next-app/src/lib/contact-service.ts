import { createHash } from "node:crypto"

import type { ContactRequestInput } from "@/lib/contact-domain"
import prisma from "@/lib/prisma"
import { enqueueOutbox } from "@/lib/outbox"

export class ContactBusinessError extends Error {
  constructor(
    readonly status: 409,
    readonly code: "IDEMPOTENCY_KEY_REUSED",
    message: string
  ) {
    super(message)
    this.name = "ContactBusinessError"
  }
}

function hashContactRequest(input: ContactRequestInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        name: input.name,
        phone: input.phone,
        email: input.email?.toLowerCase() ?? null,
        message: input.message,
      })
    )
    .digest("hex")
}

export async function createContactRequest(
  input: ContactRequestInput,
  idempotencyKey: string,
  enqueueNotification: boolean
) {
  const requestHash = hashContactRequest(input)

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`
    const existing = await tx.contactRequest.findUnique({
      where: { idempotencyKey },
      select: { id: true, requestHash: true, createdAt: true },
    })

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ContactBusinessError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "Idempotency key has already been used for different contact details."
        )
      }
      return { ...existing, replayed: true }
    }

    const created = await tx.contactRequest.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        message: input.message,
        idempotencyKey,
        requestHash,
      },
      select: { id: true, requestHash: true, createdAt: true },
    })
    if (enqueueNotification) {
      await enqueueOutbox(tx, {
        eventType: "contactRequestCreated",
        aggregateType: "contactRequest",
        aggregateId: created.id,
        idempotencyKey: `contact:${created.id}:created`,
      })
    }
    return { ...created, replayed: false }
  })
}
