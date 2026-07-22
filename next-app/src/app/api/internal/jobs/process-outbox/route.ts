import { apiSuccess } from "@/lib/api-response"
import { processOutbox } from "@/lib/outbox-worker"
import { authorizeCronJob } from "@/lib/request-security"

export async function POST(request: Request) {
  const denied = await authorizeCronJob(request, "process-outbox")
  if (denied) return denied
  return apiSuccess(await processOutbox())
}
