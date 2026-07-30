import { createHmac, timingSafeEqual } from "node:crypto"

export type PaymentWebhook = {
  eventId: string
  paymentId: string
  bookingId: string
  status: "paid" | "failed" | "expired" | "refunded"
  amount: number
  providerPaymentId: string
}

export type PersistedPaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "refunded"

export function paymentProviderConfigured() {
  return Boolean(
    process.env.PAYMENT_PROVIDER && process.env.PAYMENT_WEBHOOK_SECRET
  )
}

export function verifyPaymentSignature(
  rawBody: string,
  signature: string | null,
  secret = process.env.PAYMENT_WEBHOOK_SECRET
) {
  if (!signature || !secret) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const actual = signature.replace(/^sha256=/, "")
  const actualBuffer = Buffer.from(actual, "utf8")
  const expectedBuffer = Buffer.from(expected, "utf8")
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

export function assertBackendAmount(expected: number, received: number) {
  if (!Number.isInteger(received) || received !== expected)
    throw new Error("PAYMENT_AMOUNT_MISMATCH")
}

export function resolvePaymentWebhookTransition(
  current: PersistedPaymentStatus,
  incoming: PaymentWebhook["status"]
): { status: PersistedPaymentStatus; replayed: boolean } {
  const requested: PersistedPaymentStatus =
    incoming === "paid" ? "completed" : incoming

  if (current === requested) return { status: current, replayed: true }
  if (current === "refunded") throw new Error("INVALID_PAYMENT_TRANSITION")
  if (current === "completed") {
    if (requested === "refunded") return { status: "refunded", replayed: false }
    throw new Error("INVALID_PAYMENT_TRANSITION")
  }
  if (requested === "refunded") throw new Error("INVALID_PAYMENT_TRANSITION")

  return { status: requested, replayed: false }
}
