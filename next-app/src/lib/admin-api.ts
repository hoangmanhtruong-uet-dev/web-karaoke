import { apiError } from "@/lib/api-response"
import { getAdminPrincipal, type AdminPrincipal } from "@/lib/admin-auth"
import { hasPermission, type Permission } from "@/lib/permissions"

export async function authorizeAdminApi(
  permission: Permission
): Promise<{ principal: AdminPrincipal } | { response: Response }> {
  const principal = await getAdminPrincipal()
  if (!principal) return { response: apiError(401, "UNAUTHORIZED", "Authentication required.") }
  if (principal.mustChangePassword || !hasPermission(principal.role, permission)) {
    return { response: apiError(403, "FORBIDDEN", "You do not have permission for this operation.") }
  }
  return { principal }
}

export function hasPrincipal(
  result: Awaited<ReturnType<typeof authorizeAdminApi>>
): result is { principal: AdminPrincipal } {
  return "principal" in result
}
