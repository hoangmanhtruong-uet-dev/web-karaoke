import { apiError } from "@/lib/api-response"
import { AdminBookingError } from "@/lib/admin-booking-service"
import { AdminBranchScopeError } from "@/lib/admin-branch-scope"
import { logger } from "@/lib/logger"

export function adminServiceError(error: unknown) {
  if (error instanceof AdminBookingError) return apiError(error.status, error.code, error.message)
  if (error instanceof AdminBranchScopeError) return apiError(error.status, error.code, error.message)
  logger.error("admin_operation_failed", { errorCode: error instanceof Error ? error.constructor.name : "UNKNOWN" })
  return apiError(500, "ADMIN_OPERATION_FAILED", "Không thể thực hiện thao tác quản trị.")
}
