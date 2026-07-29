import { BranchStatus, MenuCategory, RoomStatus, RoomTier } from "@prisma/client"
import { z } from "zod"

const limitSchema = z.coerce.number().int().min(1).max(100).default(100)

export const publicBranchesQuerySchema = z
  .object({
    status: z.literal(BranchStatus.active).default(BranchStatus.active),
    limit: limitSchema,
  })
  .strict()

export const publicRoomsQuerySchema = z
  .object({
    branchId: z.string().trim().min(1).max(100).optional(),
    status: z.literal(RoomStatus.available).default(RoomStatus.available),
    tier: z.nativeEnum(RoomTier).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD.").optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm.").optional(),
    durationHours: z.coerce.number().int().min(1).max(12).optional(),
    guestCount: z.coerce.number().int().min(1).max(40).optional(),
    limit: limitSchema,
  })
  .strict()
  .superRefine((query, context) => {
    const availabilityFields = [query.date, query.startTime, query.durationHours]
    const hasAnyAvailabilityField = availabilityFields.some((value) => value !== undefined)
    const hasAllAvailabilityFields = availabilityFields.every((value) => value !== undefined)

    if (hasAnyAvailabilityField && !hasAllAvailabilityFields) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "date, startTime và durationHours phải được truyền cùng nhau.",
      })
    }
  })

export const publicMenuItemsQuerySchema = z
  .object({
    category: z.nativeEnum(MenuCategory).optional(),
    isAvailable: z.literal("true").default("true"),
    limit: limitSchema,
  })
  .strict()

export type PublicBranchesQuery = z.infer<typeof publicBranchesQuerySchema>
export type PublicRoomsQuery = z.infer<typeof publicRoomsQuerySchema>
export type PublicMenuItemsQuery = z.infer<typeof publicMenuItemsQuerySchema>

export function readQueryRecord(searchParams: URLSearchParams) {
  const record: Record<string, string> = {}

  for (const [key, value] of searchParams.entries()) {
    if (key in record) {
      return { error: `Tham số '${key}' không được truyền lặp lại.` as const }
    }
    record[key] = value
  }

  return { record }
}
