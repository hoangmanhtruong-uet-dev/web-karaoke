import type { Prisma } from "@prisma/client"

import prisma from "@/lib/prisma"
import { requestContext } from "@/lib/request-context"

type AuditInput = {
  actorId?: string | null
  actorRole?: string
  action: string
  entityType: string
  entityId: string
  oldValue?: Prisma.InputJsonValue
  newValue?: Prisma.InputJsonValue
  metadata?: Prisma.InputJsonValue
  result?: "success" | "failure" | "blocked"
  request?: Request
}

export async function writeSecurityAudit(input: AuditInput) {
  const context = requestContext(input.request)
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? "anonymous",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: input.metadata,
      result: input.result ?? "success",
      ...context,
    },
  })
}

export async function emitSecurityAlert(input: AuditInput & { reason: string }) {
  const context = requestContext(input.request)
  console.warn(JSON.stringify({
    level: "warning",
    type: "security_event",
    action: input.action,
    reason: input.reason,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: context.requestId,
  }))
  await writeSecurityAudit({ ...input, result: input.result ?? "blocked" })
}
