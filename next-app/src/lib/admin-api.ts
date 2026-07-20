import { apiError } from "@/lib/api-response"
import { getAdminPrincipal, type AdminPrincipal } from "@/lib/admin-auth"

export async function authorizeAdminApi(
  roles: Array<AdminPrincipal["role"]> = ["staff", "admin"]
): Promise<{ principal: AdminPrincipal } | { response: Response }> {
  const principal = await getAdminPrincipal()
  if (!principal) return { response: apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.") }
  if (!roles.includes(principal.role)) {
    return { response: apiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.") }
  }
  return { principal }
}

export function hasPrincipal(
  result: Awaited<ReturnType<typeof authorizeAdminApi>>
): result is { principal: AdminPrincipal } {
  return "principal" in result
}
