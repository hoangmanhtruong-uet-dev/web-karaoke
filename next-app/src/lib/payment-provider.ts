import { createHmac, timingSafeEqual } from "node:crypto"
export type PaymentWebhook = { eventId: string; paymentId: string; bookingId: string; status: "paid" | "failed" | "expired" | "refunded"; amount: number; providerPaymentId: string }
export function paymentProviderConfigured() { return Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_WEBHOOK_SECRET) }
export function verifyPaymentSignature(rawBody: string, signature: string | null, secret = process.env.PAYMENT_WEBHOOK_SECRET) {
  if (!signature || !secret) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const actual = signature.replace(/^sha256=/, "")
  const a = Buffer.from(actual, "utf8"), b = Buffer.from(expected, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}
export function assertBackendAmount(expected: number, received: number) {
  if (!Number.isInteger(received) || received !== expected) throw new Error("PAYMENT_AMOUNT_MISMATCH")
}
