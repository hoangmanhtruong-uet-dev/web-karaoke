import { z } from "zod"

function positiveInteger(name: string, fallback: number) {
  const parsed = z.coerce.number().int().positive().safeParse(process.env[name] ?? fallback)
  if (!parsed.success) throw new Error(`${name} must be a positive integer`)
  return parsed.data
}

export function getBookingHoldMinutes() {
  return positiveInteger("BOOKING_HOLD_MINUTES", 15)
}

export function getBookingReminderMinutes() {
  return positiveInteger("BOOKING_REMINDER_MINUTES", 120)
}

export function getJobBatchSize() {
  return Math.min(100, positiveInteger("JOB_BATCH_SIZE", 25))
}
