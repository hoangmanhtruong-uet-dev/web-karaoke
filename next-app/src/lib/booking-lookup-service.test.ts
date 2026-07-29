import { describe, expect, it } from "vitest"

import { maskLookupEmail, maskLookupPhone } from "@/lib/booking-lookup-service"

describe("public booking lookup masking", () => {
  it("normalizes and masks phone numbers", () => {
    expect(maskLookupPhone("+84 901 234 567")).toBe("••••••4567")
  })

  it("does not expose the full email", () => {
    expect(maskLookupEmail("guest@example.com")).toBe("g•••@example.com")
  })
})
