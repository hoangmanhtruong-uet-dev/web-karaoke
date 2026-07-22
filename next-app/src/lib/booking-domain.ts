import { createHash } from "node:crypto"

import { z } from "zod"

import { canonicalizeVietnamPhone, isValidVietnamPhone } from "@/lib/utils"

export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh"
export const DEFAULT_DURATION_HOURS = 3
export const MIN_DURATION_HOURS = 1
export const MAX_DURATION_HOURS = 12
export const MIN_GUESTS = 1
export const MAX_GUESTS = 40

export const OCCUPYING_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checkedIn",
] as const

export type OccupyingBookingStatus = (typeof OCCUPYING_BOOKING_STATUSES)[number]

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export const roomTierSchema = z.enum([
  "standard",
  "vip",
  "premium",
  "presidential",
])

export const bookingInputSchema = z.object({
  customerName: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(120),
  customerPhone: z
    .string()
    .trim()
    .refine(isValidVietnamPhone, "Số điện thoại chưa đúng định dạng.")
    .transform(canonicalizeVietnamPhone),
  branchId: z.string().trim().min(1, "Vui lòng chọn chi nhánh."),
  roomTier: roomTierSchema.optional(),
  date: z.string().regex(datePattern, "Ngày đặt phòng không hợp lệ."),
  startTime: z.string().regex(timePattern, "Giờ bắt đầu không hợp lệ."),
  durationHours: z
    .number()
    .int()
    .min(MIN_DURATION_HOURS, `Thời lượng tối thiểu ${MIN_DURATION_HOURS} giờ.`)
    .max(MAX_DURATION_HOURS, `Thời lượng tối đa ${MAX_DURATION_HOURS} giờ.`),
  guestCount: z
    .number()
    .int()
    .min(MIN_GUESTS, `Số khách tối thiểu là ${MIN_GUESTS}.`)
    .max(MAX_GUESTS, `Số khách tối đa là ${MAX_GUESTS}.`),
  selectedMenuIds: z.array(z.string().trim().min(1)).max(50).default([]),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự.").default(""),
})

export type BookingInput = z.infer<typeof bookingInputSchema>

export type BookingWindow = {
  startAt: Date
  endAt: Date
}

function isValidCalendarDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  const candidate = new Date(Date.UTC(year, month - 1, day))

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  )
}

export function toVietnamBookingWindow(
  date: string,
  startTime: string,
  durationHours: number
): BookingWindow | null {
  if (
    !datePattern.test(date) ||
    !timePattern.test(startTime) ||
    !isValidCalendarDate(date)
  ) {
    return null
  }

  if (
    !Number.isInteger(durationHours) ||
    durationHours < MIN_DURATION_HOURS ||
    durationHours > MAX_DURATION_HOURS
  ) {
    return null
  }

  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = startTime.split(":").map(Number)
  // Việt Nam dùng UTC+7 quanh năm và không áp dụng daylight-saving time.
  const startAt = new Date(Date.UTC(year, month - 1, day, hour - 7, minute))
  const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000)

  return { startAt, endAt }
}

export function intervalsOverlap(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
) {
  return existingStart < newEnd && existingEnd > newStart
}

export function roomHasCapacity(capacity: unknown, guestCount: number) {
  if (typeof capacity !== "object" || capacity === null || !("max" in capacity))
    return false
  const maximum = (capacity as { max?: unknown }).max
  return (
    typeof maximum === "number" &&
    Number.isInteger(maximum) &&
    maximum >= guestCount
  )
}

export type BookingConflictRecord = BookingWindow & {
  roomId: string
  branchId: string
  status: string
}

export function bookingBlocksSlot(
  existing: BookingConflictRecord,
  candidate: BookingConflictRecord
) {
  return (
    existing.roomId === candidate.roomId &&
    existing.branchId === candidate.branchId &&
    OCCUPYING_BOOKING_STATUSES.includes(
      existing.status as OccupyingBookingStatus
    ) &&
    intervalsOverlap(
      existing.startAt,
      existing.endAt,
      candidate.startAt,
      candidate.endAt
    )
  )
}

export function hashBookingRequest(input: BookingInput) {
  const canonicalPayload = JSON.stringify({
    ...input,
    customerPhone: canonicalizeVietnamPhone(input.customerPhone),
    selectedMenuIds: [...new Set(input.selectedMenuIds)].sort(),
  })

  return createHash("sha256").update(canonicalPayload).digest("hex")
}

export function validateBookingWindow(
  window: BookingWindow | null,
  now = new Date()
) {
  if (!window) return "Ngày hoặc giờ đặt phòng không hợp lệ."
  if (window.startAt <= now) return "Thời gian đặt phòng phải ở tương lai."
  return null
}
