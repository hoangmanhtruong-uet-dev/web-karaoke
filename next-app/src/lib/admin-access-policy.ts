export type AdminAccessDecision = "allow" | "deny" | "redirect-to-setup"

type SessionUser = {
  role?: string
  twoFactorVerified?: boolean
  requiresTwoFactorSetup?: boolean
}

const TWO_FACTOR_SETUP_PAGE = "/admin/2fa/setup"
const TWO_FACTOR_SETUP_API = "/api/admin/me/2fa/setup"

function isTwoFactorSetupRoute(pathname: string) {
  return (
    pathname === TWO_FACTOR_SETUP_PAGE ||
    pathname.startsWith(TWO_FACTOR_SETUP_API)
  )
}

export function decideAdminAccess(
  user: SessionUser | null | undefined,
  pathname: string
): AdminAccessDecision {
  if (!user) return "deny"
  if (user.role === "staff" || user.role === "manager") return "allow"
  if (user.role !== "admin") return "deny"

  if (user.requiresTwoFactorSetup) {
    if (isTwoFactorSetupRoute(pathname)) return "allow"
    return pathname.startsWith("/admin") ? "redirect-to-setup" : "deny"
  }

  return user.twoFactorVerified ? "allow" : "deny"
}

export const adminTwoFactorSetupPath = TWO_FACTOR_SETUP_PAGE
