import { timingSafeEqual } from "node:crypto"

import { apiError } from "@/lib/api-response"
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  getClientIp,
  hasTrustedProxyConfiguration,
} from "@/lib/request-context"
import { emitSecurityAlert, writeSecurityAudit } from "@/lib/security-audit"

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? request.headers.get("referer")
  const trustsProxy = hasTrustedProxyConfiguration()
  const host = trustsProxy
    ? (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
    : request.headers.get("host")
  if (!origin || !host) return false
  try {
    const source = new URL(origin)
    const forwardedProto = trustsProxy
      ? request.headers.get("x-forwarded-proto")
      : null
    const expectedProtocol =
      forwardedProto === "https" || forwardedProto === "http"
        ? `${forwardedProto}:`
        : new URL(request.url).protocol
    return source.host === host && source.protocol === expectedProtocol
  } catch {
    return false
  }
}

export async function readJsonBody(
  request: Request,
  maximumBytes: number
): Promise<unknown> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase()
  if (contentType !== "application/json")
    throw new RequestBodyError(415, "UNSUPPORTED_MEDIA_TYPE")
  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyError(413, "PAYLOAD_TOO_LARGE")
  }
  const reader = request.body?.getReader()
  if (!reader) throw new RequestBodyError(400, "INVALID_JSON")

  const decoder = new TextDecoder()
  let receivedBytes = 0
  let text = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    receivedBytes += value.byteLength
    if (receivedBytes > maximumBytes) {
      void reader.cancel("payload too large").catch(() => undefined)
      throw new RequestBodyError(413, "PAYLOAD_TOO_LARGE")
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new RequestBodyError(400, "INVALID_JSON")
  }
}

export class RequestBodyError extends Error {
  constructor(
    readonly status: 400 | 413 | 415,
    readonly code: string
  ) {
    super(code)
    this.name = "RequestBodyError"
  }
}

export async function readJsonBodyResult(
  request: Request,
  maximumBytes = 8 * 1024
) {
  try {
    return { data: await readJsonBody(request, maximumBytes) } as const
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return {
        response: apiError(
          error.status,
          error.code,
          "Request body is invalid or too large."
        ),
      } as const
    }
    return {
      response: apiError(
        400,
        "INVALID_JSON",
        "Request body is not valid JSON."
      ),
    } as const
  }
}

export function requireSameOrigin(request: Request) {
  return validateSameOrigin(request)
    ? null
    : apiError(403, "INVALID_ORIGIN", "Nguồn request không hợp lệ.")
}

export function verifyCronSecret(request: Request) {
  const configured = process.env.CRON_SECRET
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!configured || !supplied) return false
  const configuredBuffer = Buffer.from(configured)
  const suppliedBuffer = Buffer.from(supplied)
  return (
    configuredBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(configuredBuffer, suppliedBuffer)
  )
}

export async function authorizeCronJob(request: Request, jobName: string) {
  if (verifyCronSecret(request)) {
    await writeSecurityAudit({
      action: "cron.authorized",
      entityType: "cronJob",
      entityId: jobName,
      actorRole: "system",
      request,
    })
    return null
  }
  const ip = getClientIp(request)
  const decision = await consumeRateLimit({
    scope: "cron-invalid",
    identifier: ip === "unknown" ? "unresolved-cron-source" : ip,
    limit: 10,
    windowMs: 15 * 60_000,
  })
  if (decision.newlyBlocked) {
    await emitSecurityAlert({
      action: "cron.rejected",
      entityType: "cronJob",
      entityId: jobName,
      reason: "invalid_secret",
      request,
    })
  } else if (decision.allowed) {
    await writeSecurityAudit({
      action: "cron.rejected",
      entityType: "cronJob",
      entityId: jobName,
      actorRole: "anonymous",
      result: "failure",
      request,
    })
  }
  return decision.allowed
    ? apiError(401, "UNAUTHORIZED", "Invalid cron credential.")
    : rateLimitResponse(decision)
}
