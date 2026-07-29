import type { BookingStatus } from "@/types"

export type BookingStatusMeta = {
  label: string
  description: string
  nextStep: string
  icon: string
  tone: "warning" | "success" | "info" | "muted" | "danger"
}

export const BOOKING_STATUS_META: Record<BookingStatus, BookingStatusMeta> = {
  pending: {
    label: "Yêu cầu đang chờ xác nhận",
    description: "Phòng chỉ được giữ chính thức sau khi nhân viên xác nhận.",
    nextStep: "Nhân viên sẽ kiểm tra và liên hệ để xác nhận phòng, hạng phòng và khung giờ.",
    icon: "⏳",
    tone: "warning",
  },
  confirmed: {
    label: "Đã xác nhận",
    description: "Booking đã được nhân viên xác nhận.",
    nextStep: "Bạn chỉ cần đến đúng thời gian đã đặt và cung cấp mã booking.",
    icon: "✓",
    tone: "success",
  },
  checkedIn: {
    label: "Đang sử dụng",
    description: "Khách đã nhận phòng.",
    nextStep: "Booking đang được phục vụ tại chi nhánh.",
    icon: "▶",
    tone: "info",
  },
  completed: {
    label: "Đã hoàn tất",
    description: "Booking đã kết thúc.",
    nextStep: "Không cần thực hiện thêm bước nào.",
    icon: "✓",
    tone: "muted",
  },
  cancelled: {
    label: "Đã hủy",
    description: "Booking không còn hiệu lực.",
    nextStep: "Bạn có thể tạo một yêu cầu đặt phòng mới.",
    icon: "×",
    tone: "danger",
  },
  rejected: {
    label: "Không thể xác nhận",
    description: "Booking đã bị từ chối và không còn giữ phòng.",
    nextStep: "Vui lòng chọn khung giờ hoặc chi nhánh khác.",
    icon: "!",
    tone: "danger",
  },
  expired: {
    label: "Đã hết hạn giữ chỗ",
    description: "Yêu cầu đã hết thời gian giữ chỗ mà chưa được xác nhận.",
    nextStep: "Bạn có thể tạo một yêu cầu đặt phòng mới.",
    icon: "⌛",
    tone: "muted",
  },
}

export function getBookingStatusMeta(status: string): BookingStatusMeta {
  return BOOKING_STATUS_META[status as BookingStatus] ?? {
    label: "Trạng thái chưa xác định",
    description: "Vui lòng liên hệ chi nhánh để được hỗ trợ.",
    nextStep: "Liên hệ chi nhánh với mã booking của bạn.",
    icon: "?",
    tone: "muted",
  }
}
