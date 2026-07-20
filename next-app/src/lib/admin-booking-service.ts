import { Prisma, type BookingStatus, type OutboxEventType } from "@prisma/client"

import type { AdminPrincipal } from "@/lib/admin-auth"
import { canTransitionBooking, getBookingTransitionTimestamp } from "@/lib/booking-state-machine"
import { OCCUPYING_BOOKING_STATUSES, roomHasCapacity } from "@/lib/booking-domain"
import { enqueueOutbox } from "@/lib/outbox"
import prisma from "@/lib/prisma"

export class AdminBookingError extends Error {
  constructor(readonly status: 404 | 409 | 422, readonly code: string, message: string) {
    super(message)
    this.name = "AdminBookingError"
  }
}

const transitionEvents: Partial<Record<BookingStatus, OutboxEventType>> = {
  confirmed: "bookingConfirmed",
  rejected: "bookingRejected",
  cancelled: "bookingCancelled",
  expired: "bookingExpired",
}

type Actor = Pick<AdminPrincipal, "id" | "role"> | { id: null; role: "system" }

export async function transitionBooking(
  bookingId: string,
  targetStatus: BookingStatus,
  actor: Actor,
  now = new Date()
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, expiresAt: true },
    })
    if (!booking) throw new AdminBookingError(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking.")
    if (!canTransitionBooking(booking.status, targetStatus)) {
      throw new AdminBookingError(409, "INVALID_BOOKING_TRANSITION", `Không thể chuyển ${booking.status} sang ${targetStatus}.`)
    }
    if (targetStatus === "confirmed" && booking.expiresAt && booking.expiresAt <= now) {
      throw new AdminBookingError(409, "BOOKING_ALREADY_EXPIRED", "Booking đã hết thời gian giữ chỗ.")
    }

    const updated = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: booking.status,
        ...(targetStatus === "confirmed" ? { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } : {}),
      },
      data: { status: targetStatus, ...getBookingTransitionTimestamp(targetStatus, now) },
    })
    if (updated.count !== 1) {
      throw new AdminBookingError(409, "BOOKING_CONFLICT", "Booking vừa được cập nhật bởi tiến trình khác.")
    }

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: `booking.${targetStatus}`,
        entityType: "booking",
        entityId: booking.id,
        oldValue: { status: booking.status },
        newValue: { status: targetStatus },
      },
    })

    const eventType = transitionEvents[targetStatus]
    if (eventType) {
      await enqueueOutbox(tx, {
        eventType,
        aggregateType: "booking",
        aggregateId: booking.id,
        idempotencyKey: `booking:${booking.id}:status:${targetStatus}`,
      })
    }
    return { id: booking.id, status: targetStatus }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function reassignBookingRoom(input: {
  bookingId: string
  roomId: string
  allowTierChange: boolean
  actor: AdminPrincipal
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`reassign:${input.bookingId}`}, 0))`
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        select: { id: true, roomId: true, branchId: true, guestCount: true, startAt: true, endAt: true, status: true, room: { select: { tier: true } } },
      })
      if (!booking) throw new AdminBookingError(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking.")
      if (!booking.startAt || !booking.endAt) throw new AdminBookingError(422, "INVALID_BOOKING_TIME", "Booking chưa có khoảng thời gian hợp lệ.")

      const room = await tx.room.findUnique({ where: { id: input.roomId }, select: { id: true, branchId: true, tier: true, status: true, capacity: true } })
      if (!room || room.status !== "available" || room.branchId !== booking.branchId) {
        throw new AdminBookingError(422, "ROOM_NOT_AVAILABLE", "Phòng không khả dụng hoặc không cùng chi nhánh.")
      }
      if (!roomHasCapacity(room.capacity, booking.guestCount)) {
        throw new AdminBookingError(422, "ROOM_CAPACITY_INSUFFICIENT", "Sức chứa phòng không đủ.")
      }
      if (booking.room?.tier && room.tier !== booking.room.tier && !input.allowTierChange) {
        throw new AdminBookingError(422, "ROOM_TIER_CHANGE_REQUIRES_CONFIRMATION", "Cần xác nhận khi đổi hạng phòng.")
      }

      const conflicts = await tx.booking.count({
        where: {
          id: { not: booking.id }, roomId: room.id,
          status: { in: [...OCCUPYING_BOOKING_STATUSES] },
          startAt: { lt: booking.endAt }, endAt: { gt: booking.startAt },
        },
      })
      if (conflicts > 0) throw new AdminBookingError(409, "ROOM_NOT_AVAILABLE", "Phòng đã có booking trong khung giờ này.")

      if (booking.roomId === room.id) return { id: booking.id, roomId: room.id }

      await tx.booking.update({ where: { id: booking.id }, data: { roomId: room.id } })
      const audit = await tx.auditLog.create({
        data: { actorId: input.actor.id, actorRole: input.actor.role, action: "booking.roomReassigned", entityType: "booking", entityId: booking.id, oldValue: { roomId: booking.roomId }, newValue: { roomId: room.id, tier: room.tier } },
      })
      await enqueueOutbox(tx, { eventType: "bookingRoomChanged", aggregateType: "booking", aggregateId: booking.id, idempotencyKey: `booking:${booking.id}:room-change:${audit.id}` })
      return { id: booking.id, roomId: room.id }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof AdminBookingError) throw error
    const message = error instanceof Error ? error.message : ""
    if (message.includes("Booking_no_overlapping_room_time") || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
      throw new AdminBookingError(409, "BOOKING_CONFLICT", "Phòng vừa được gán cho booking khác.")
    }
    throw error
  }
}

export async function addAdminNote(input: { bookingId?: string; contactRequestId?: string; content: string; actor: AdminPrincipal }) {
  const entityType = input.bookingId ? "booking" : "contactRequest"
  const entityId = input.bookingId ?? input.contactRequestId
  if (!entityId) throw new AdminBookingError(422, "INVALID_NOTE_ENTITY", "Ghi chú phải thuộc một đối tượng.")
  return prisma.$transaction(async (tx) => {
    const note = await tx.adminNote.create({ data: { authorId: input.actor.id, bookingId: input.bookingId, contactRequestId: input.contactRequestId, content: input.content } })
    await tx.auditLog.create({ data: { actorId: input.actor.id, actorRole: input.actor.role, action: `${entityType}.noteAdded`, entityType, entityId, newValue: { noteId: note.id } } })
    return note
  })
}
