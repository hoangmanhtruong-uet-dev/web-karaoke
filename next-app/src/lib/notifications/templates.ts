import type { Booking, Branch, OutboxEventType, Room } from "@prisma/client"

import type { NotificationMessage } from "@/lib/notifications/provider"
import { getBookingStatusMeta } from "@/lib/booking-status"

type BookingView = Pick<Booking, "code" | "customerEmail" | "customerPhone" | "guestCount" | "startAt" | "endAt" | "status"> & {
  branch: Pick<Branch, "name" | "phone">
  room: Pick<Room, "name" | "tier"> | null
}

const labels: Partial<Record<OutboxEventType, string>> = {
  bookingCreated: "Đã nhận yêu cầu đặt phòng",
  bookingConfirmed: "Booking đã được xác nhận",
  bookingRejected: "Booking không thể xác nhận",
  bookingCancelled: "Booking đã hủy",
  bookingExpired: "Yêu cầu giữ phòng đã hết hạn",
  bookingRoomChanged: "Phòng hát đã được thay đổi",
  bookingReminder: "Nhắc lịch karaoke sắp diễn ra",
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;")
}

export function maskRecipient(recipient: string) {
  if (recipient.includes("@")) {
    const [name, domain] = recipient.split("@")
    return `${name.slice(0, 2)}***@${domain}`
  }
  const digits = recipient.replace(/\D/g, "")
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***"
}

export function bookingNotification(eventType: OutboxEventType, booking: BookingView, recipient: string, channel: "email" | "internal" = "email"): NotificationMessage {
  const title = labels[eventType] ?? "Cập nhật booking"
  const formatter = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full", timeStyle: "short" })
  const time = booking.startAt ? formatter.format(booking.startAt) : "Chưa xác định"
  const room = booking.room ? `${booking.room.name} (${booking.room.tier})` : "Nhân viên sẽ tư vấn"
  const status = getBookingStatusMeta(booking.status)
  const lines = [title, `Mã booking: ${booking.code}`, `Chi nhánh: ${booking.branch.name}`, `Phòng: ${room}`, `Thời gian: ${time}`, `Số khách: ${booking.guestCount}`, `Trạng thái: ${status.label}`, `Liên hệ: ${booking.branch.phone}`]
  const text = lines.join("\n")
  return {
    idempotencyKey: `${booking.code}:${eventType}:${channel}`,
    channel,
    recipient,
    recipientMasked: maskRecipient(recipient),
    subject: `[Royal Karaoke] ${title} - ${booking.code}`,
    text,
    html: `<h1>${escapeHtml(title)}</h1>${lines.slice(1).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}`,
    template: eventType,
  }
}

export function contactAdminNotification(code: string, recipient: string): NotificationMessage {
  return { idempotencyKey: `contact:${code}:created`, channel: "internal", recipient, recipientMasked: maskRecipient(recipient), subject: "[Royal Karaoke] Có yêu cầu liên hệ mới", text: "Có một yêu cầu liên hệ mới trong trang quản trị.", html: "<p>Có một yêu cầu liên hệ mới trong trang quản trị.</p>", template: "contactRequestCreated" }
}
