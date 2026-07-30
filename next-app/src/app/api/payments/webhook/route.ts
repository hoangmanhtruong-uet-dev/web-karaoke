import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import {
  assertBackendAmount,
  paymentProviderConfigured,
  resolvePaymentWebhookTransition,
  verifyPaymentSignature,
} from "@/lib/payment-provider"
import prisma from "@/lib/prisma"

const MAX_WEBHOOK_BYTES = 64 * 1024
const eventSchema = z.object({
  eventId: z.string().min(1).max(180),
  paymentId: z.string().min(1),
  bookingId: z.string().min(1),
  status: z.enum(["paid", "failed", "expired", "refunded"]),
  amount: z.number().int().nonnegative(),
  providerPaymentId: z.string().min(1).max(180),
})

export async function POST(request: Request) {
  if (!paymentProviderConfigured())
    return apiError(
      503,
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      "Thanh toán trực tuyến chưa được tích hợp."
    )

  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES)
    return apiError(413, "PAYLOAD_TOO_LARGE", "Payment webhook is too large.")

  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_WEBHOOK_BYTES)
    return apiError(413, "PAYLOAD_TOO_LARGE", "Payment webhook is too large.")
  if (
    !verifyPaymentSignature(
      raw,
      request.headers.get("x-payment-signature")
    )
  )
    return apiError(
      401,
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid webhook signature."
    )

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return apiError(400, "INVALID_WEBHOOK", "Invalid webhook payload.")
  }
  const event = eventSchema.safeParse(parsed)
  if (!event.success)
    return apiError(400, "INVALID_WEBHOOK", "Invalid webhook payload.")

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: event.data.paymentId },
      include: { booking: true },
    })
    if (!payment || payment.bookingId !== event.data.bookingId)
      return { ok: false as const, code: "PAYMENT_NOT_FOUND" }
    if (payment.lastWebhookId === event.data.eventId)
      return { ok: true as const, replayed: true }

    if (event.data.status === "paid") {
      try {
        assertBackendAmount(
          payment.booking.totalAmount ?? payment.amount,
          event.data.amount
        )
      } catch {
        return { ok: false as const, code: "PAYMENT_AMOUNT_MISMATCH" }
      }
    }

    let transition
    try {
      transition = resolvePaymentWebhookTransition(
        payment.status,
        event.data.status
      )
    } catch {
      return { ok: false as const, code: "INVALID_PAYMENT_TRANSITION" }
    }
    if (transition.replayed) return { ok: true as const, replayed: true }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: transition.status,
        lastWebhookId: event.data.eventId,
        providerPaymentId: event.data.providerPaymentId,
        paidAt:
          transition.status === "completed"
            ? payment.paidAt ?? new Date()
            : payment.paidAt,
      },
    })
    await tx.auditLog.create({
      data: {
        actorRole: "payment-provider",
        action: "payment.webhook",
        entityType: "payment",
        entityId: payment.id,
        metadata: { eventId: event.data.eventId, status: transition.status },
        result: "success",
      },
    })
    return { ok: true as const, replayed: false }
  })

  if (!result.ok) {
    const status =
      result.code === "PAYMENT_AMOUNT_MISMATCH" ||
      result.code === "INVALID_PAYMENT_TRANSITION"
        ? 409
        : 404
    return apiError(status, result.code, "Payment webhook rejected.")
  }
  return apiSuccess({ accepted: true, replayed: result.replayed })
}
