import { randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { apiError } from "@/lib/api-response"

const DEPENDENCY_CODES = new Set([
  "P1000", "P1001", "P1002", "P1008", "P1011", "P1017", "P2024",
  "53300", "57P01", "57P02", "57P03", "57014",
  "08000", "08001", "08003", "08004", "08006", "08007", "08P01",
  "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT",
])

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return null
  return typeof error.code === "string" ? error.code : null
}

export function isDependencyUnavailable(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientRustPanicError) return true
  const code = errorCode(error)
  return Boolean(code && DEPENDENCY_CODES.has(code))
}

export function operationalErrorResponse(error: unknown, event: string, fallbackCode = "INTERNAL_ERROR", fallbackMessage = "The request could not be completed.") {
  const requestId = randomUUID()
  const unavailable = isDependencyUnavailable(error)
  console.error(JSON.stringify({
    level: "error",
    event,
    requestId,
    category: unavailable ? "dependency_unavailable" : "unexpected_error",
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    errorCode: errorCode(error),
  }))
  return unavailable
    ? apiError(503, "DEPENDENCY_UNAVAILABLE", "The service is temporarily unavailable.", undefined, { requestId, headers: { "Retry-After": "5" } })
    : apiError(500, fallbackCode, fallbackMessage, undefined, { requestId })
}

export function withOperationalErrorHandling<Arguments extends unknown[]>(event: string, handler: (...args: Arguments) => Promise<Response>) {
  return async (...args: Arguments) => {
    try {
      return await handler(...args)
    } catch (error) {
      return operationalErrorResponse(error, event)
    }
  }
}
