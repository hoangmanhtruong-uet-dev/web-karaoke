import { describe, expect, it } from "vitest"
import { assertBackendAmount, verifyPaymentSignature } from "@/lib/payment-provider"
import { createHmac } from "node:crypto"
describe("payment security",()=>{it("accepts valid webhook signature",()=>{const body='{"eventId":"e1"}';const sig=createHmac("sha256","secret").update(body).digest("hex");expect(verifyPaymentSignature(body,sig,"secret")).toBe(true)});it("rejects invalid signature",()=>expect(verifyPaymentSignature("{}","bad","secret")).toBe(false));it("rejects amount mismatch",()=>expect(()=>assertBackendAmount(100,99)).toThrow("PAYMENT_AMOUNT_MISMATCH"))})
