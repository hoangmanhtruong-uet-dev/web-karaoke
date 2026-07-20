import { apiError } from "@/lib/api-response"
import { AdminBookingError } from "@/lib/admin-booking-service"

export function adminServiceError(error: unknown) {
  if (error instanceof AdminBookingError) return apiError(error.status, error.code, error.message)
  console.error("Admin operation failed", { error: error instanceof Error ? error.message : "Unknown error" })
  return apiError(500, "ADMIN_OPERATION_FAILED", "Không thể thực hiện thao tác quản trị.")
}
