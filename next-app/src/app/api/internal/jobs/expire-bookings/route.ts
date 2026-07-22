import { apiSuccess } from "@/lib/api-response"
import { expireDueBookings } from "@/lib/booking-jobs"
import { authorizeCronJob } from "@/lib/request-security"

export async function POST(request: Request) {
  const denied = await authorizeCronJob(request, "expire-bookings")
  if (denied) return denied
  return apiSuccess(await expireDueBookings())
}
