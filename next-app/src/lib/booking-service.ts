import { randomUUID } from "node:crypto"

import { Prisma, type RoomTier } from "@prisma/client"

import {
  type BookingInput,
  hashBookingRequest,
  OCCUPYING_BOOKING_STATUSES,
  toVietnamBookingWindow,
  validateBookingWindow,
} from "@/lib/booking-domain"
import prisma from "@/lib/prisma"
import { enqueueOutbox } from "@/lib/outbox"
import { getBookingHoldMinutes } from "@/lib/server-config"

const MAX_TRANSACTION_ATTEMPTS = 3

type RoomCandidate = {
  id: string
}

export class BookingBusinessError extends Error {
  constructor(
    readonly status: 409 | 422,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message)
    this.name = "BookingBusinessError"
  }
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

function isOverlapConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  return message.includes("Booking_no_overlapping_room_time")
}

async function sleepBeforeRetry(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt))
}

export type CreateBookingResult = {
  bookingId: string
  replayed: boolean
  expiresAt: Date | null
}

export async function createBooking(
  input: BookingInput,
  idempotencyKey: string,
  now = new Date()
): Promise<CreateBookingResult> {
  const window = toVietnamBookingWindow(input.date, input.startTime, input.durationHours)
  const windowError = validateBookingWindow(window, now)

  if (!window || windowError) {
    throw new BookingBusinessError(422, "INVALID_BOOKING_TIME", windowError ?? "Thời gian không hợp lệ.", {
      date: [windowError ?? "Thời gian không hợp lệ."],
    })
  }

  const requestHash = hashBookingRequest(input)
  const expiresAt = new Date(now.getTime() + getBookingHoldMinutes() * 60_000)

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Serialize retries carrying the same idempotency key before checking/creating.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`

          const existing = await tx.booking.findUnique({
            where: { idempotencyKey },
            select: { id: true, requestHash: true, expiresAt: true },
          })

          if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new BookingBusinessError(
                409,
                "IDEMPOTENCY_KEY_REUSED",
                "Idempotency key đã được dùng cho một nội dung booking khác."
              )
            }

            return { bookingId: existing.id, replayed: true, expiresAt: existing.expiresAt }
          }

          const branch = await tx.branch.findUnique({
            where: { id: input.branchId },
            select: { status: true },
          })

          if (!branch || branch.status !== "active") {
            throw new BookingBusinessError(
              422,
              "INVALID_BRANCH",
              "Chi nhánh không tồn tại hoặc hiện không hoạt động.",
              { branchId: ["Vui lòng chọn một chi nhánh đang hoạt động."] }
            )
          }

          const requestedMenuIds = [...new Set(input.selectedMenuIds)]
          const selectedMenuItems = requestedMenuIds.length
            ? await tx.menuItem.findMany({
                where: { id: { in: requestedMenuIds }, isAvailable: true },
                select: { id: true, price: true },
              })
            : []

          if (selectedMenuItems.length !== requestedMenuIds.length) {
            throw new BookingBusinessError(
              422,
              "INVALID_MENU_ITEMS",
              "Một hoặc nhiều món đã chọn không tồn tại hoặc không còn phục vụ.",
              { selectedMenuIds: ["Vui lòng chọn lại menu đang khả dụng."] }
            )
          }

          const requestedTier = input.roomTier ?? null
          const candidates = await tx.$queryRaw<RoomCandidate[]>(Prisma.sql`
            SELECT room.id
            FROM "Room" AS room
            WHERE room."branchId" = ${input.branchId}
              AND room.status = 'available'::"RoomStatus"
              AND (${requestedTier}::text IS NULL OR room.tier::text = ${requestedTier})
              AND COALESCE(room.capacity->>'max', '') ~ '^[0-9]+$'
              AND (room.capacity->>'max')::integer >= ${input.guestCount}
              AND NOT EXISTS (
                SELECT 1
                FROM "Booking" AS booking
                WHERE booking."roomId" = room.id
                  AND booking.status::text IN (${Prisma.join(OCCUPYING_BOOKING_STATUSES)})
                  AND booking."startAt" < ${window.endAt}
                  AND booking."endAt" > ${window.startAt}
              )
            ORDER BY room."createdAt" ASC, room.id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          `)

          const selectedRoom = candidates[0]

          if (!selectedRoom) {
            throw new BookingBusinessError(
              409,
              "ROOM_UNAVAILABLE",
              "Không còn phòng phù hợp với chi nhánh, hạng phòng, sức chứa và khung giờ đã chọn."
            )
          }

          const booking = await tx.booking.create({
            data: {
              code: `RK-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              branchId: input.branchId,
              roomId: selectedRoom.id,
              date: input.date,
              startTime: input.startTime,
              durationHours: input.durationHours,
              startAt: window.startAt,
              endAt: window.endAt,
              guestCount: input.guestCount,
              note: input.note || null,
              status: "pending",
              idempotencyKey,
              requestHash,
              expiresAt,
              menuItems: {
                create: selectedMenuItems.map((item) => ({
                  menuItemId: item.id,
                  quantity: 1,
                  price: item.price,
                })),
              },
            },
            select: { id: true },
          })

          await enqueueOutbox(tx, {
            eventType: "bookingCreated",
            aggregateType: "booking",
            aggregateId: booking.id,
            idempotencyKey: `booking:${booking.id}:created`,
          })

          return { bookingId: booking.id, replayed: false, expiresAt }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (error) {
      if (error instanceof BookingBusinessError) throw error

      // A concurrent transaction using the same key may have committed after
      // this Serializable transaction took its snapshot. Resolve its unique
      // conflict as an idempotent replay instead of exposing a database error.
      if (isUniqueConstraintError(error)) {
        const existing = await prisma.booking.findUnique({
          where: { idempotencyKey },
          select: { id: true, requestHash: true, expiresAt: true },
        })

        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new BookingBusinessError(
              409,
              "IDEMPOTENCY_KEY_REUSED",
              "Idempotency key đã được dùng cho một nội dung booking khác."
            )
          }
          return { bookingId: existing.id, replayed: true, expiresAt: existing.expiresAt }
        }
      }

      if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
        await sleepBeforeRetry(attempt)
        continue
      }

      if (isOverlapConstraintError(error)) {
        throw new BookingBusinessError(
          409,
          "ROOM_UNAVAILABLE",
          "Phòng vừa được người khác giữ trong khung giờ này. Vui lòng chọn thời gian khác."
        )
      }

      throw error
    }
  }

  throw new BookingBusinessError(
    409,
    "BOOKING_CONFLICT",
    "Có booking khác vừa được tạo. Vui lòng thử lại."
  )
}

export function normalizeRoomTier(value: string): RoomTier | undefined {
  return ["standard", "vip", "premium", "presidential"].includes(value)
    ? (value as RoomTier)
    : undefined
}
