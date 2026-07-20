import { apiError, apiSuccess } from "@/lib/api-response"
import { expireDueBookings } from "@/lib/booking-jobs"
import { verifyCronSecret } from "@/lib/request-security"

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) return apiError(401, "UNAUTHORIZED", "Cron secret không hợp lệ.")
  return apiSuccess(await expireDueBookings())
}
