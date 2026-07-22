import { apiSuccess } from "@/lib/api-response"
import { createBookingReminders } from "@/lib/booking-jobs"
import { authorizeCronJob } from "@/lib/request-security"

export async function POST(request: Request) {
  const denied = await authorizeCronJob(request, "create-reminders")
  if (denied) return denied
  return apiSuccess(await createBookingReminders())
}
