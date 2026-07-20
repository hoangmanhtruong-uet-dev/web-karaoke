import { Prisma } from "@prisma/client"

import { enqueueOutbox } from "@/lib/outbox"
import prisma from "@/lib/prisma"
import { getBookingReminderMinutes, getJobBatchSize } from "@/lib/server-config"

export async function expireDueBookings(now = new Date(), batchSize = getJobBatchSize()) {
  return prisma.$transaction(async (tx) => {
    const due = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "Booking"
      WHERE status = 'pending'::"BookingStatus" AND "expiresAt" <= ${now}
      ORDER BY "expiresAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    `)
    let expired = 0
    for (const booking of due) {
      const updated = await tx.booking.updateMany({ where: { id: booking.id, status: "pending", expiresAt: { lte: now } }, data: { status: "expired", expiredAt: now } })
      if (updated.count !== 1) continue
      expired += 1
      await tx.auditLog.create({ data: { actorRole: "system", action: "booking.expired", entityType: "booking", entityId: booking.id, oldValue: { status: "pending" }, newValue: { status: "expired" } } })
      await enqueueOutbox(tx, { eventType: "bookingExpired", aggregateType: "booking", aggregateId: booking.id, idempotencyKey: `booking:${booking.id}:status:expired` })
    }
    return { scanned: due.length, expired }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
}

export async function createBookingReminders(now = new Date(), batchSize = getJobBatchSize()) {
  const reminderAt = new Date(now.getTime() + getBookingReminderMinutes() * 60_000)
  const windowEnd = new Date(reminderAt.getTime() + 10 * 60_000)
  return prisma.$transaction(async (tx) => {
    const bookings = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "Booking"
      WHERE status = 'confirmed'::"BookingStatus"
        AND "startAt" >= ${reminderAt} AND "startAt" < ${windowEnd}
      ORDER BY "startAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    `)
    let created = 0
    for (const booking of bookings) {
      const result = await tx.outboxEvent.createMany({
        data: [{ eventType: "bookingReminder", aggregateType: "booking", aggregateId: booking.id, payload: { aggregateId: booking.id }, idempotencyKey: `booking:${booking.id}:reminder` }],
        skipDuplicates: true,
      })
      created += result.count
    }
    return { scanned: bookings.length, created }
  })
}
