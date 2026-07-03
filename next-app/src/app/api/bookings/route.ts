import { NextRequest, NextResponse } from "next/server"
import { RoomTier } from "@prisma/client"

import prisma from "@/lib/prisma"
import { isValidVietnamPhone } from "@/lib/utils"

type BookingRequestBody = {
  name?: unknown
  phone?: unknown
  branchId?: unknown
  roomType?: unknown
  date?: unknown
  time?: unknown
  guests?: unknown
  selectedMenuItems?: unknown
  note?: unknown

  customerName?: unknown
  customerPhone?: unknown
  roomTier?: unknown
  startTime?: unknown
  guestCount?: unknown
  selectedMenuIds?: unknown
}

type BookingApiResponse = {
  success: boolean
  message: string
  bookingId?: string
  errors?: Record<string, string>
}

const MIN_GUESTS = 1
const MAX_GUESTS = 40
const validRoomTiers = new Set<RoomTier>([
  "standard",
  "vip",
  "premium",
  "presidential",
])

function isRoomTier(value: string): value is RoomTier {
  return validRoomTiers.has(value as RoomTier)
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim())
}

type NormalizedBooking = {
  customerName: string
  customerPhone: string
  branchId: string
  roomTier: RoomTier | ""
  date: string
  startTime: string
  guestCount: number
  selectedMenuIds: string[]
  note: string
}

function normalizeBookingPayload(body: BookingRequestBody): NormalizedBooking {
  const guestCountValue = body.guests ?? body.guestCount
  const guestCount =
    typeof guestCountValue === "number"
      ? guestCountValue
      : Number.parseInt(getString(guestCountValue), 10)

  const roomTierValue = getString(body.roomType ?? body.roomTier)
  const roomTier = isRoomTier(roomTierValue) ? (roomTierValue as RoomTier) : ""

  return {
    customerName: getString(body.name ?? body.customerName),
    customerPhone: getString(body.phone ?? body.customerPhone),
    branchId: getString(body.branchId),
    roomTier,
    date: getString(body.date),
    startTime: getString(body.time ?? body.startTime),
    guestCount,
    selectedMenuIds: getStringArray(body.selectedMenuItems ?? body.selectedMenuIds),
    note: getString(body.note),
  }
}

async function validateBooking(booking: NormalizedBooking) {
  const errors: Record<string, string> = {}

  if (!booking.customerName) {
    errors.name = "Vui lòng nhập họ tên."
  }

  if (!booking.customerPhone) {
    errors.phone = "Vui lòng nhập số điện thoại."
  } else if (!isValidVietnamPhone(booking.customerPhone)) {
    errors.phone = "Số điện thoại chưa đúng định dạng."
  }

  if (!booking.branchId) {
    errors.branchId = "Vui lòng chọn chi nhánh."
  } else {
    const branch = await prisma.branch.findUnique({
      where: { id: booking.branchId },
      select: { id: true, status: true },
    })
    if (!branch) {
      errors.branchId = "Chi nhánh không hợp lệ."
    } else if (branch.status !== "active") {
      errors.branchId = "Chi nhánh không hoạt động."
    }
  }

  if (!booking.date) {
    errors.date = "Vui lòng chọn ngày đặt phòng."
  } else {
    const bookingDate = new Date(`${booking.date}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (Number.isNaN(bookingDate.getTime())) {
      errors.date = "Ngày đặt phòng không hợp lệ."
    } else if (bookingDate < today) {
      errors.date = "Ngày đặt phòng không được ở quá khứ."
    }
  }

  if (!booking.startTime) {
    errors.time = "Vui lòng chọn giờ bắt đầu."
  } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.startTime)) {
    errors.time = "Giờ bắt đầu không hợp lệ."
  }

  if (
    !Number.isFinite(booking.guestCount) ||
    booking.guestCount < MIN_GUESTS ||
    booking.guestCount > MAX_GUESTS
  ) {
    errors.guests = `Số khách phải trong khoảng ${MIN_GUESTS}-${MAX_GUESTS}.`
  }

  // Validate menu items
  if (booking.selectedMenuIds && booking.selectedMenuIds.length > 0) {
    const unavailableMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: booking.selectedMenuIds },
        OR: [{ isAvailable: false }],
      },
      select: { id: true, name: true },
    })

    if (unavailableMenuItems.length > 0) {
      const unavailableNames = unavailableMenuItems.map((m: { id: string; name: string }) => m.name).join(", ")
      errors.selectedMenuItems = `Các món sau không khả dụng: ${unavailableNames}`
    }
  }

  // Validate room availability
  if (booking.roomTier && booking.branchId) {
    const roomCount = await prisma.room.count({
      where: {
        branchId: booking.branchId,
        tier: booking.roomTier,
        status: "available",
      },
    })
    if (roomCount === 0) {
      errors.roomType = "Hạng phòng này hiện chưa có phòng trống tại chi nhánh đã chọn."
    }
  }

  if (booking.note && booking.note.length > 500) {
    errors.note = "Ghi chú tối đa 500 ký tự."
  }

  return errors
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingRequestBody
    const booking = normalizeBookingPayload(body)
    const errors = await validateBooking(booking)

    if (Object.keys(errors).length > 0) {
      return NextResponse.json<BookingApiResponse>(
        {
          success: false,
          message: "Thông tin đặt phòng chưa hợp lệ.",
          errors,
        },
        { status: 400 }
      )
    }

    const selectedRoom = booking.roomTier
      ? await prisma.room.findFirst({
          where: {
            branchId: booking.branchId,
            tier: booking.roomTier,
            status: "available",
          },
          select: { id: true },
        })
      : null

    const selectedMenuItems: Array<{ id: string; price: number }> =
      booking.selectedMenuIds.length > 0
        ? await prisma.menuItem.findMany({
            where: {
              id: { in: booking.selectedMenuIds },
              isAvailable: true,
            },
            select: { id: true, price: true },
          })
        : []

    const dbBooking = await prisma.booking.create({
      data: {
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        branchId: booking.branchId,
        roomId: selectedRoom?.id,
        date: booking.date,
        startTime: booking.startTime,
        guestCount: booking.guestCount,
        note: booking.note || null,
        status: "pending",
        menuItems: {
          create: selectedMenuItems.map((item) => ({
            menuItemId: item.id,
            quantity: 1,
            price: item.price,
          })),
        },
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        branchId: true,
        roomId: true,
        date: true,
        startTime: true,
        guestCount: true,
        note: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json<BookingApiResponse>(
      {
        success: true,
        message: "Đã nhận yêu cầu đặt phòng. Nhân viên sẽ liên hệ xác nhận trong ít phút.",
        bookingId: dbBooking.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json<BookingApiResponse>(
      {
        success: false,
        message: "Không thể xử lý yêu cầu đặt phòng lúc này. Vui lòng thử lại sau.",
      },
      { status: 500 }
    )
  }
}