import { describe, expect, it } from "vitest"

import { hasPermission } from "@/lib/permissions"

describe("role permission matrix", () => {
  it("keeps staff within operations", () => {
    expect(hasPermission("staff", "booking.update")).toBe(true)
    expect(hasPermission("staff", "payment.read")).toBe(false)
    expect(hasPermission("staff", "staff.manage")).toBe(false)
  })

  it("allows managers to manage services but not accounts", () => {
    expect(hasPermission("manager", "service.manage")).toBe(true)
    expect(hasPermission("manager", "staff.manage")).toBe(false)
  })

  it("allows admins privileged operations", () => {
    expect(hasPermission("admin", "staff.manage")).toBe(true)
    expect(hasPermission("admin", "outbox.retry")).toBe(true)
  })
})
