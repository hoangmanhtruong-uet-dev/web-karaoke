import type { OutboxEventType, Prisma } from "@prisma/client"

type OutboxInput = {
  eventType: OutboxEventType
  aggregateType: "booking" | "contactRequest"
  aggregateId: string
  idempotencyKey: string
  payload?: Prisma.InputJsonObject
}

export async function enqueueOutbox(tx: Prisma.TransactionClient, input: OutboxInput) {
  return tx.outboxEvent.create({
    data: {
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload ?? { aggregateId: input.aggregateId },
    },
  })
}
