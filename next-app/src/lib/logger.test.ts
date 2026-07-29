import { describe, expect, it } from "vitest"
import { redact } from "@/lib/logger"

describe("redact", () => {
  it("redacts nested credentials and personal identifiers", () => {
    expect(redact({ password: "p", nested: { accessToken: "t", email: "a@b" }, ok: "x" })).toEqual({ password: "[REDACTED]", nested: { accessToken: "[REDACTED]", email: "[REDACTED]" }, ok: "x" })
  })
})
