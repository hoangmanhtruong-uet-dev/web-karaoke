import { randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { apiError } from "@/lib/api-response"
import { logger } from "@/lib/logger"

const DEPENDENCY_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1008",
  "P1011",
  "P1017",
  "P2024",
  "P2037",
  "P2039",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "57014",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
])

const DEPENDENCY_MESSAGE_PATTERNS = [
  /\b(?:ECONNREFUSED|ECONNRESET|ETIMEDOUT)\b/i,
  /\bconnection\b.{0,80}\b(?:closed|terminated|reset|refused|timeout|timed out)\b/i,
  /\b(?:closed|terminated|reset|refused|timeout|timed out)\b.{0,80}\bconnection\b/i,
  /\bquery\b.{0,40}\b(?:timeout|timed out)\b/i,
]
const PRISMA_TIMEOUT_PATTERN = /\b(?:timeout|timed out)\b/i

function errorChain(error: unknown) {
  const chain: unknown[] = []
  const seen = new Set<unknown>()
  let current = error

  while (
    current !== null &&
    (typeof current === "object" || typeof current === "function") &&
    !seen.has(current) &&
    chain.length < 5
  ) {
    chain.push(current)
    seen.add(current)
    current = "cause" in current ? current.cause : null
  }

  return chain
}

function errorCode(error: unknown) {
  for (const candidate of errorChain(error)) {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "code" in candidate &&
      typeof candidate.code === "string"
    )
      return candidate.code
  }
  return null
}

export function isDependencyUnavailable(error: unknown) {
  const chain = errorChain(error)
  const prismaClientError = chain.some(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "clientVersion" in candidate &&
      typeof candidate.clientVersion === "string"
  )

  return chain.some((candidate) => {
    if (
      candidate instanceof Prisma.PrismaClientInitializationError ||
      candidate instanceof Prisma.PrismaClientRustPanicError
    )
      return true

    const code = errorCode(candidate)
    if (code && DEPENDENCY_CODES.has(code)) return true

    return (
      candidate instanceof Error &&
      (DEPENDENCY_MESSAGE_PATTERNS.some((pattern) =>
        pattern.test(candidate.message)
      ) ||
        (prismaClientError && PRISMA_TIMEOUT_PATTERN.test(candidate.message)))
    )
  })
}

export function operationalErrorResponse(
  error: unknown,
  event: string,
  fallbackCode = "INTERNAL_ERROR",
  fallbackMessage = "The request could not be completed."
) {
  const requestId = randomUUID()
  const unavailable = isDependencyUnavailable(error)
  logger.error(event, {
    requestId,
    category: unavailable ? "dependency_unavailable" : "unexpected_error",
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    errorCode: errorCode(error) ?? undefined,
  })
  return unavailable
    ? apiError(
        503,
        "DEPENDENCY_UNAVAILABLE",
        "The service is temporarily unavailable.",
        undefined,
        { requestId, headers: { "Retry-After": "5" } }
      )
    : apiError(500, fallbackCode, fallbackMessage, undefined, { requestId })
}

export function withOperationalErrorHandling<Arguments extends unknown[]>(
  event: string,
  handler: (...args: Arguments) => Promise<Response>
) {
  return async (...args: Arguments) => {
    try {
      return await handler(...args)
    } catch (error) {
      return operationalErrorResponse(error, event)
    }
  }
}
