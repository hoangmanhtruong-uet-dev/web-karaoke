import { timingSafeEqual } from "node:crypto"

import { apiError } from "@/lib/api-response"

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function requireSameOrigin(request: Request) {
  return validateSameOrigin(request)
    ? null
    : apiError(403, "INVALID_ORIGIN", "Nguồn request không hợp lệ.")
}

export function verifyCronSecret(request: Request) {
  const configured = process.env.CRON_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!configured || !supplied) return false
  const configuredBuffer = Buffer.from(configured)
  const suppliedBuffer = Buffer.from(supplied)
  return configuredBuffer.length === suppliedBuffer.length && timingSafeEqual(configuredBuffer, suppliedBuffer)
}
