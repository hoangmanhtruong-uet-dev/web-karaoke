import { randomUUID } from "node:crypto"

import prisma from "@/lib/prisma"
import { hashSecurityIdentifier } from "@/lib/request-context"

export type RateLimitRule = {
  scope: string
  identifier: string
  limit: number
  windowMs: number
  blockMs?: number
}

export type RateLimitDecision = {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
  newlyBlocked: boolean
}

const UNKNOWN_IDENTIFIER = "unknown"
const RETENTION_MS = 24 * 60 * 60 * 1000
const CLEANUP_INTERVAL = 256
let callsUntilCleanup = CLEANUP_INTERVAL

function unrestrictedDecision(rule: RateLimitRule): RateLimitDecision {
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: rule.limit,
    newlyBlocked: false,
  }
}

function keyFor(rule: RateLimitRule) {
  return hashSecurityIdentifier(`${rule.scope}:${rule.identifier}`)
}

export async function checkRateLimit(
  rule: RateLimitRule,
  now = new Date()
): Promise<RateLimitDecision> {
  if (!rule.identifier || rule.identifier === UNKNOWN_IDENTIFIER)
    return unrestrictedDecision(rule)
  const bucket = await prisma.securityRateLimit.findUnique({
    where: { keyHash: keyFor(rule) },
  })
  if (!bucket) return unrestrictedDecision(rule)
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.blockedUntil.getTime() - now.getTime()) / 1000)
      ),
      remaining: 0,
      newlyBlocked: false,
    }
  }
  if (now.getTime() - bucket.windowStartedAt.getTime() >= rule.windowMs) {
    return unrestrictedDecision(rule)
  }
  return {
    allowed: bucket.count < rule.limit,
    retryAfterSeconds: 0,
    remaining: Math.max(0, rule.limit - bucket.count),
    newlyBlocked: false,
  }
}

export async function consumeRateLimit(
  rule: RateLimitRule,
  now = new Date()
): Promise<RateLimitDecision> {
  if (!rule.identifier || rule.identifier === UNKNOWN_IDENTIFIER)
    return unrestrictedDecision(rule)
  const keyHash = keyFor(rule)
  const decision = await prisma.$transaction(async (tx) => {
    // PostgreSQL advisory locking makes the fixed-window increment atomic across
    // serverless instances/containers that share the same database.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${keyHash}, 0))`
    const existing = await tx.securityRateLimit.findUnique({
      where: { keyHash },
    })
    if (existing?.blockedUntil && existing.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000)
        ),
        remaining: 0,
        newlyBlocked: false,
      }
    }
    const windowExpired =
      !existing ||
      now.getTime() - existing.windowStartedAt.getTime() >= rule.windowMs
    const count = windowExpired ? 1 : existing.count + 1
    const newlyBlocked = count >= rule.limit
    const blockedUntil = newlyBlocked
      ? new Date(now.getTime() + (rule.blockMs ?? rule.windowMs))
      : null
    await tx.securityRateLimit.upsert({
      where: { keyHash },
      create: {
        keyHash,
        scope: rule.scope,
        count,
        windowStartedAt: now,
        blockedUntil,
      },
      update: {
        scope: rule.scope,
        count,
        windowStartedAt: windowExpired
          ? now
          : (existing?.windowStartedAt ?? now),
        blockedUntil,
      },
    })
    return {
      allowed: count <= rule.limit,
      retryAfterSeconds: blockedUntil
        ? Math.max(
            1,
            Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
          )
        : 0,
      remaining: Math.max(0, rule.limit - count),
      newlyBlocked,
    }
  })

  callsUntilCleanup -= 1
  if (callsUntilCleanup <= 0) {
    callsUntilCleanup = CLEANUP_INTERVAL
    await pruneRateLimitBuckets(now).catch(() => {
      console.error(
        JSON.stringify({
          level: "error",
          event: "rate_limit_retention_cleanup_failed",
        })
      )
    })
  }
  return decision
}

export async function pruneRateLimitBuckets(
  now = new Date(),
  retentionMs = RETENTION_MS
) {
  const cutoff = new Date(now.getTime() - retentionMs)
  return prisma.securityRateLimit.deleteMany({
    where: {
      updatedAt: { lt: cutoff },
      OR: [{ blockedUntil: null }, { blockedUntil: { lte: now } }],
    },
  })
}

export async function clearRateLimit(rules: RateLimitRule[]) {
  await prisma.securityRateLimit.deleteMany({
    where: { keyHash: { in: rules.map(keyFor) } },
  })
}

export function rateLimitResponse(decision: RateLimitDecision) {
  return Response.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, decision.retryAfterSeconds)),
        "Cache-Control": "no-store",
        "X-Request-ID": randomUUID(),
      },
    }
  )
}
