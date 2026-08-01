import { describe, expect, it } from "vitest"

import {
  adminTwoFactorSetupPath,
  decideAdminAccess,
} from "@/lib/admin-access-policy"

describe("admin route access policy", () => {
  it("redirects an enrolled-pending admin from the dashboard to setup", () => {
    expect(
      decideAdminAccess(
        {
          role: "admin",
          twoFactorVerified: false,
          requiresTwoFactorSetup: true,
        },
        "/admin"
      )
    ).toBe("redirect-to-setup")
  })

  it("allows the setup page and setup API during enrollment", () => {
    const user = {
      role: "admin",
      twoFactorVerified: false,
      requiresTwoFactorSetup: true,
    }

    expect(decideAdminAccess(user, adminTwoFactorSetupPath)).toBe("allow")
    expect(decideAdminAccess(user, "/api/admin/me/2fa/setup")).toBe("allow")
    expect(decideAdminAccess(user, "/api/admin/bookings")).toBe("deny")
  })

  it("allows verified admins and staff while rejecting unverified admins", () => {
    expect(
      decideAdminAccess(
        {
          role: "admin",
          twoFactorVerified: true,
          requiresTwoFactorSetup: false,
        },
        "/admin"
      )
    ).toBe("allow")
    expect(
      decideAdminAccess(
        {
          role: "admin",
          twoFactorVerified: false,
          requiresTwoFactorSetup: false,
        },
        "/admin"
      )
    ).toBe("deny")
    expect(decideAdminAccess({ role: "staff" }, "/admin")).toBe("allow")
  })
})
