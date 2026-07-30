import { describe, expect, it } from "vitest"

import {
  AdminBranchScopeError,
  getBookingBranchScope,
  resolveAdminBranchId,
} from "@/lib/admin-branch-scope"

describe("admin branch scope", () => {
  it("forces staff onto the assigned branch", () => {
    const principal = { role: "staff" as const, assignedBranchId: "branch-a" }

    expect(resolveAdminBranchId(principal)).toBe("branch-a")
    expect(getBookingBranchScope(principal, "branch-a")).toEqual({
      branchId: "branch-a",
    })
  })

  it("rejects a staff-supplied branch override", () => {
    expect(() =>
      resolveAdminBranchId(
        { role: "staff", assignedBranchId: "branch-a" },
        "branch-b"
      )
    ).toThrow(AdminBranchScopeError)
  })

  it("fails closed when staff has no assigned branch", () => {
    expect(() =>
      getBookingBranchScope({ role: "staff", assignedBranchId: null })
    ).toThrowError(
      expect.objectContaining({
        status: 403,
        code: "BRANCH_SCOPE_FORBIDDEN",
      })
    )
  })

  it("preserves the existing global manager scope", () => {
    expect(getBookingBranchScope({ role: "manager" })).toEqual({})
    expect(
      getBookingBranchScope({ role: "manager" }, "branch-b")
    ).toEqual({ branchId: "branch-b" })
  })

  it("allows admins to use a branch filter", () => {
    expect(getBookingBranchScope({ role: "admin" }, "branch-b")).toEqual({
      branchId: "branch-b",
    })
  })
})
