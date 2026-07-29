import { randomUUID } from "node:crypto"

import { Prisma, type BookingStatus, type RoomTier } from "@prisma/client"

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
import { requestContext } from "@/lib/request-context"
import { calculateRoomPrice, pricingSnapshot } from "@/lib/pricing-service"

const MAX_TRANSACTION_ATTEMPTS = 3

type RoomCandidate = { id: string; branchId: string; tier: RoomTier; hourlyRate: number }

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
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  )
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
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
  bookingCode: string
  status: BookingStatus
  replayed: boolean
  expiresAt: Date | null
}

export async function createBooking(
  input: BookingInput,
  idempotencyKey: string,
  now = new Date(),
  request?: Request
): Promise<CreateBookingResult> {
  const window = toVietnamBookingWindow(
    input.date,
    input.startTime,
    input.durationHours
  )
  const windowError = validateBookingWindow(window, now)

  if (!window || windowError) {
    throw new BookingBusinessError(
      422,
      "INVALID_BOOKING_TIME",
      windowError ?? "ThÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âi gian khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£p lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¡.",
      {
        date: [windowError ?? "ThÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âi gian khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£p lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¡."],
      }
    )
  }

  const requestHash = hashBookingRequest(input)
  const expiresAt = new Date(now.getTime() + getBookingHoldMinutes() * 60_000)
  const context = requestContext(request)

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Serialize retries carrying the same idempotency key before checking/creating.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`

          const existing = await tx.booking.findUnique({
            where: { idempotencyKey },
            select: { id: true, code: true, status: true, requestHash: true, expiresAt: true },
          })

          if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new BookingBusinessError(
                409,
                "IDEMPOTENCY_KEY_REUSED",
                "Idempotency key Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â°Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£c dĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¹ng cho mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢t nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢i dung booking khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡c."
              )
            }

            return {
              bookingId: existing.id,
              bookingCode: existing.code,
              status: existing.status,
              replayed: true,
              expiresAt: existing.expiresAt,
            }
          }

          const branch = await tx.branch.findUnique({
            where: { id: input.branchId },
            select: { status: true },
          })

          if (!branch || branch.status !== "active") {
            throw new BookingBusinessError(
              422,
              "INVALID_BRANCH",
              "Chi nhĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡nh khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¦Ă¢â‚¬Å“n tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â·c hiÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¡n khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡t Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢ng.",
              { branchId: ["Vui lĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢t chi nhĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡nh Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œang hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡t Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢ng."] }
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
              "MÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢t hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â·c nhiÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âu mĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³n Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¦Ă¢â‚¬Å“n tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â·c khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng cĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²n phÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¥c vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¥.",
              { selectedMenuIds: ["Vui lĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i menu Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œang khÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ dÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¥ng."] }
            )
          }

          const requestedTier = input.roomTier ?? null
          const candidates = await tx.$queryRaw<RoomCandidate[]>(Prisma.sql`
            SELECT room.id, room."branchId", room.tier, room."hourlyRate"
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
              "KhĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng cĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²n phĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng phĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¹ hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£p vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Âºi chi nhĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡nh, hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡ng phĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng, sÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©c chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©a vĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â  khung giÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân."
            )
          }

          const pricingRuleClient = (tx as unknown as { pricingRule?: { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> } }).pricingRule
          const pricingRules = pricingRuleClient ? await pricingRuleClient.findMany({
            where: { branchId: input.branchId, isActive: true },
            select: { id: true, name: true, branchId: true, roomId: true, roomTier: true, ruleType: true, specificDate: true, dayOfWeek: true, startMinute: true, endMinute: true, hourlyRate: true, priority: true, validFrom: true, validTo: true, isActive: true },
          }) : []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const roomPrice = calculateRoomPrice(selectedRoom, window.startAt, window.endAt, (pricingRules as any[]).map((rule: any) => ({ ...rule, roomTier: rule.roomTier ?? null, specificDate: rule.specificDate?.toISOString().slice(0, 10) ?? null, validFrom: rule.validFrom.toISOString().slice(0, 10), validTo: rule.validTo?.toISOString().slice(0, 10) ?? null })))

          const customer = await tx.customer.upsert({
            where: { phone: input.customerPhone },
            create: {
              fullName: input.customerName,
              phone: input.customerPhone,
            },
            update: {
              fullName: input.customerName,
            },
            select: { id: true },
          })

          const booking = await tx.booking.create({
            data: {
              code: `RK-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              customerId: customer.id,
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
              roomAmount: roomPrice.total,
              totalAmount: roomPrice.total + selectedMenuItems.reduce((sum, item) => sum + item.price, 0),
              priceSnapshot: pricingSnapshot(roomPrice),
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
            select: { id: true, code: true },
          })

          await tx.auditLog.create({
            data: {
              actorRole: "anonymous",
              action: "booking.created",
              entityType: "booking",
              entityId: booking.id,
              newValue: {
                status: "pending",
                branchId: input.branchId,
                roomId: selectedRoom.id,
              },
              result: "success",
              ...context,
            },
          })
          await enqueueOutbox(tx, {
            eventType: "bookingCreated",
            aggregateType: "booking",
            aggregateId: booking.id,
            idempotencyKey: `booking:${booking.id}:created`,
          })

          return { bookingId: booking.id, bookingCode: booking.code, status: "pending", replayed: false, expiresAt }
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
          select: { id: true, code: true, status: true, requestHash: true, expiresAt: true },
        })

        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new BookingBusinessError(
              409,
              "IDEMPOTENCY_KEY_REUSED",
              "Idempotency key Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â°Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£c dĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¹ng cho mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢t nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢i dung booking khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡c."
            )
          }
          return {
            bookingId: existing.id,
              bookingCode: existing.code,
              status: existing.status,
              replayed: true,
            expiresAt: existing.expiresAt,
          }
        }
      }

      if (
        isRetryableTransactionError(error) &&
        attempt < MAX_TRANSACTION_ATTEMPTS - 1
      ) {
        await sleepBeforeRetry(attempt)
        continue
      }

      if (isOverlapConstraintError(error)) {
        throw new BookingBusinessError(
          409,
          "ROOM_UNAVAILABLE",
          "PhĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â«a Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â°Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£c ngÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â°Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âi khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡c giÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¯ trong khung giÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â nĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â y. Vui lĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân thÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âi gian khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡c."
        )
      }

      throw error
    }
  }

  throw new BookingBusinessError(
    409,
    "BOOKING_CONFLICT",
    "CĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³ booking khĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡c vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â«a Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â°Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£c tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡o. Vui lĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng thÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­ lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i."
  )
}

export function normalizeRoomTier(value: string): RoomTier | undefined {
  return ["standard", "vip", "premium", "presidential"].includes(value)
    ? (value as RoomTier)
    : undefined
}





