import { Prisma, BookingStatus, ContactStatus, RoomTier } from "@prisma/client"
import { z } from "zod"

import prisma from "@/lib/prisma"

const bookingQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  search: z.string().trim().max(120).optional(),
  status: z.preprocess((value) => value === "" ? undefined : value, z.nativeEnum(BookingStatus).optional()),
  branchId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().optional()),
  roomId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().optional()),
  tier: z.preprocess((value) => value === "" ? undefined : value, z.nativeEnum(RoomTier).optional()),
  from: z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional()),
  to: z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional()),
  sort: z.enum(["createdAt", "startAt", "status"]).catch("createdAt"),
  order: z.enum(["asc", "desc"]).catch("desc"),
  expiringSoon: z.enum(["true", "false"]).optional(),
})

export type BookingAdminQuery = Record<string, unknown>

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 4 ? `*** *** ${digits.slice(-4)}` : "***"
}

export async function listAdminBookings(input: BookingAdminQuery) {
  const query = bookingQuerySchema.parse(input)
  const now = new Date()
  const where: Prisma.BookingWhereInput = {
    ...(query.search ? { OR: [
      { code: { contains: query.search, mode: "insensitive" } },
      { customerName: { contains: query.search, mode: "insensitive" } },
      { customerPhone: { contains: query.search } },
      { customerEmail: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.roomId ? { roomId: query.roomId } : {}),
    ...(query.tier ? { room: { tier: query.tier } } : {}),
    ...(query.from || query.to ? { startAt: { gte: query.from, lte: query.to } } : {}),
    ...(query.expiringSoon === "true" ? { status: "pending", expiresAt: { gt: now, lte: new Date(now.getTime() + 5 * 60_000) } } : {}),
  }
  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true, code: true, customerName: true, customerPhone: true, guestCount: true,
        startAt: true, endAt: true, status: true, expiresAt: true, source: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        room: { select: { id: true, name: true, tier: true } },
      },
    }),
  ])
  return { items: bookings.map((booking) => ({ ...booking, customerPhone: maskPhone(booking.customerPhone) })), total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) }
}

export async function getAdminBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      branch: true, room: true, menuItems: { include: { menuItem: true } },
      adminNotes: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } },
      notificationDeliveries: { orderBy: { createdAt: "desc" } },
    },
  })
}

export async function getBookingAudit(id: string) {
  return prisma.auditLog.findMany({ where: { entityType: "booking", entityId: id }, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } })
}

export async function getAdminDashboard(now = new Date()) {
  const vietnamNow = new Date(now.getTime() + 7 * 60 * 60_000)
  const startUtc = new Date(Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate()) - 7 * 60 * 60_000)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60_000)
  const [today, grouped, contacts, upcoming, nearExpiry, deadLetters] = await Promise.all([
    prisma.booking.count({ where: { startAt: { gte: startUtc, lt: endUtc } } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contactRequest.count({ where: { status: { in: ["new", "inProgress"] } } }),
    prisma.booking.count({ where: { status: { in: ["confirmed", "pending"] }, startAt: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60_000) } } }),
    prisma.booking.count({ where: { status: "pending", expiresAt: { gt: now, lte: new Date(now.getTime() + 5 * 60_000) } } }),
    prisma.outboxEvent.count({ where: { status: "deadLetter" } }),
  ])
  return { today, byStatus: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])), contacts, upcoming, nearExpiry, deadLetters }
}

const contactQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1), pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  search: z.string().trim().max(120).optional(), status: z.preprocess((value) => value === "" ? undefined : value, z.nativeEnum(ContactStatus).optional()),
})

export async function listAdminContacts(input: Record<string, unknown>) {
  const query = contactQuerySchema.parse(input)
  const where: Prisma.ContactRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { phone: { contains: query.search } }, { email: { contains: query.search, mode: "insensitive" } }] } : {}),
  }
  const [total, items] = await prisma.$transaction([
    prisma.contactRequest.count({ where }),
    prisma.contactRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: { id: true, name: true, phone: true, email: true, message: true, status: true, createdAt: true } }),
  ])
  return { items: items.map((item) => ({ ...item, phone: maskPhone(item.phone) })), total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) }
}
