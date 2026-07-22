import { createHash, randomUUID } from "node:crypto"

import { Prisma, type OutboxEvent } from "@prisma/client"

import { bookingNotification, contactAdminNotification } from "@/lib/notifications/templates"
import { getNotificationProvider, type NotificationMessage } from "@/lib/notifications/provider"
import prisma from "@/lib/prisma"
import { getJobBatchSize } from "@/lib/server-config"

const BACKOFF_MINUTES = [0, 1, 5, 30, 120] as const

export function nextOutboxAttempt(attemptCount: number, now = new Date()) {
  const index = Math.min(attemptCount, BACKOFF_MINUTES.length - 1)
  return new Date(now.getTime() + BACKOFF_MINUTES[index] * 60_000)
}

async function claimEvents(now: Date, batchSize: number) {
  const lockToken = randomUUID()
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "OutboxEvent"
      WHERE status IN ('pending'::"OutboxStatus", 'failed'::"OutboxStatus")
        AND "nextAttemptAt" <= ${now}
        AND ("lockedAt" IS NULL OR "lockedAt" < ${new Date(now.getTime() - 10 * 60_000)})
      ORDER BY "createdAt" ASC FOR UPDATE SKIP LOCKED LIMIT ${batchSize}
    `)
    if (!rows.length) return []
    const ids = rows.map((row) => row.id)
    await tx.outboxEvent.updateMany({ where: { id: { in: ids } }, data: { status: "processing", lockedAt: now, lockToken, attemptCount: { increment: 1 } } })
    return tx.outboxEvent.findMany({ where: { id: { in: ids }, lockToken } })
  })
}

async function messagesForEvent(event: OutboxEvent): Promise<NotificationMessage[]> {
  if (event.aggregateType === "contactRequest") {
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL
    if (!recipient) throw new Error("ADMIN_NOTIFICATION_EMAIL is not configured")
    return [contactAdminNotification(event.aggregateId, recipient)]
  }
  const booking = await prisma.booking.findUnique({
    where: { id: event.aggregateId },
    select: { code: true, customerEmail: true, customerPhone: true, guestCount: true, startAt: true, endAt: true, status: true, branch: { select: { name: true, phone: true } }, room: { select: { name: true, tier: true } } },
  })
  if (!booking) throw new Error("Booking aggregate no longer exists")
  const messages: NotificationMessage[] = []
  if (booking.customerEmail) messages.push(bookingNotification(event.eventType, booking, booking.customerEmail))
  const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminRecipient) messages.push(bookingNotification(event.eventType, booking, adminRecipient, "internal"))
  if (!messages.length) throw new Error("No notification recipient is configured")
  return messages
}

async function processEvent(event: OutboxEvent, now: Date) {
  const provider = getNotificationProvider()
  try {
    const messages = await messagesForEvent(event)
    for (const message of messages) {
      const recipientHash = createHash("sha256").update(message.recipient.trim().toLowerCase()).digest("hex")
      const deliveryKey = { outboxEventId: event.id, channel: message.channel, recipientHash }
      const existing = await prisma.notificationDelivery.findUnique({ where: { outboxEventId_channel_recipientHash: deliveryKey } })
      if (existing?.status === "sent") continue
      try {
        const result = await provider.send({ ...message, idempotencyKey: `${event.id}:${message.channel}:${recipientHash}` })
        await prisma.notificationDelivery.upsert({
          where: { outboxEventId_channel_recipientHash: deliveryKey },
          create: { outboxEventId: event.id, bookingId: event.aggregateType === "booking" ? event.aggregateId : null, channel: message.channel, recipientHash, recipientMasked: message.recipientMasked, template: message.template, status: "sent", providerMessageId: result.providerMessageId, attemptCount: event.attemptCount, sentAt: now },
          update: { status: "sent", providerMessageId: result.providerMessageId, attemptCount: event.attemptCount, sentAt: now, errorSummary: null },
        })
      } catch (error) {
        const errorSummary = (error instanceof Error ? error.message : "Notification provider failed").slice(0, 500)
        await prisma.notificationDelivery.upsert({
          where: { outboxEventId_channel_recipientHash: deliveryKey },
          create: { outboxEventId: event.id, bookingId: event.aggregateType === "booking" ? event.aggregateId : null, channel: message.channel, recipientHash, recipientMasked: message.recipientMasked, template: message.template, status: "failed", attemptCount: event.attemptCount, errorSummary },
          update: { status: "failed", attemptCount: event.attemptCount, errorSummary },
        })
        throw error
      }
    }
    await prisma.outboxEvent.updateMany({ where: { id: event.id, lockToken: event.lockToken, status: "processing" }, data: { status: "processed", processedAt: now, lockedAt: null, lockToken: null, lastError: null } })
    return true
  } catch (error) {
    const deadLetter = event.attemptCount >= BACKOFF_MINUTES.length
    const summary = (error instanceof Error ? error.message : "Unknown notification error").slice(0, 500)
    await prisma.outboxEvent.updateMany({ where: { id: event.id, lockToken: event.lockToken }, data: { status: deadLetter ? "deadLetter" : "failed", nextAttemptAt: nextOutboxAttempt(event.attemptCount, now), lockedAt: null, lockToken: null, lastError: summary } })
    return false
  }
}

export async function processOutbox(now = new Date(), batchSize = getJobBatchSize()) {
  if (process.env.EMAIL_PROVIDER?.trim() === "disabled") {
    return { claimed: 0, processed: 0, failed: 0, disabled: true }
  }
  const events = await claimEvents(now, batchSize)
  let processed = 0
  for (const event of events) if (await processEvent(event, now)) processed += 1
  return { claimed: events.length, processed, failed: events.length - processed }
}
