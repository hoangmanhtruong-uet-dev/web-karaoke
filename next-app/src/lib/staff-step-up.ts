import type { AdminPrincipal } from "@/lib/admin-auth"
import {
  clearRateLimit,
  consumeRateLimit,
  rateLimitResponse,
  type RateLimitDecision,
  type RateLimitRule,
} from "@/lib/rate-limit"
import { writeSecurityAudit } from "@/lib/security-audit"

const STEP_UP_WINDOW_MS = 15 * 60_000
const STEP_UP_BLOCK_MS = 15 * 60_000

export type StaffStepUpReservation = {
  rule: RateLimitRule
  decision: RateLimitDecision
}

type StaffStepUpAdmission =
  | { reservation: StaffStepUpReservation; response?: never }
  | { response: Response; reservation?: never }

function stepUpRule(actorId: string): RateLimitRule {
  return {
    scope: "staff-step-up-account",
    identifier: actorId,
    limit: 5,
    windowMs: STEP_UP_WINDOW_MS,
    blockMs: STEP_UP_BLOCK_MS,
  }
}

export async function reserveStaffStepUp(
  actorId: string
): Promise<StaffStepUpAdmission> {
  const rule = stepUpRule(actorId)
  const decision = await consumeRateLimit(rule)
  if (!decision.allowed) return { response: rateLimitResponse(decision) }
  return { reservation: { rule, decision } }
}

export async function releaseStaffStepUp(reservation: StaffStepUpReservation) {
  await clearRateLimit([reservation.rule])
}

export async function handleStaffStepUpFailure(
  reservation: StaffStepUpReservation,
  actor: AdminPrincipal,
  request: Request,
  entityId: string,
  errorCode: string
) {
  if (errorCode !== "REAUTHENTICATION_REQUIRED") {
    await releaseStaffStepUp(reservation)
    return null
  }

  const blocked = reservation.decision.newlyBlocked
  await writeSecurityAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: blocked ? "staff.stepUpBlocked" : "staff.stepUpFailed",
    entityType: "adminUser",
    entityId,
    result: blocked ? "blocked" : "failure",
    request,
  })
  return blocked ? rateLimitResponse(reservation.decision) : null
}
