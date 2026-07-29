export const MIN_DURATION_HOURS = 1 as const
export const MAX_DURATION_HOURS = 12 as const
export const DEFAULT_DURATION_HOURS = 3 as const

export const BOOKING_DURATION_OPTIONS = Array.from(
  { length: MAX_DURATION_HOURS - MIN_DURATION_HOURS + 1 },
  (_, index) => {
    const value = MIN_DURATION_HOURS + index
    return { value, label: `${value} giờ` }
  }
) as ReadonlyArray<{ value: number; label: string }>

export function isValidDurationHours(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_DURATION_HOURS && value <= MAX_DURATION_HOURS
}

export type BookingTimeParts = { date: string; time: string }

export function getBookingEndTime(
  date: string,
  startTime: string,
  durationHours: number
): BookingTimeParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !isValidDurationHours(durationHours)) return null

  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = startTime.split(":").map(Number)
  const start = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) return null

  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, "0")
  return {
    date: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
    time: `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`,
  }
}

export function formatBookingTime(parts: BookingTimeParts | null): string {
  if (!parts) return "Chưa đủ thông tin"
  const [year, month, day] = parts.date.split("-")
  return `${parts.time} · ${day}/${month}/${year}`
}
