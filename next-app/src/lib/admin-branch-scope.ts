import type { Prisma } from "@prisma/client"

import type { AdminPrincipal } from "@/lib/admin-auth"

type BranchScopedPrincipal = Pick<
  AdminPrincipal,
  "role" | "assignedBranchId"
>

export class AdminBranchScopeError extends Error {
  readonly status = 403
  readonly code = "BRANCH_SCOPE_FORBIDDEN"

  constructor(message = "You do not have access to this branch.") {
    super(message)
    this.name = "AdminBranchScopeError"
  }
}

export function resolveAdminBranchId(
  principal: BranchScopedPrincipal,
  requestedBranchId?: string
) {
  if (principal.role !== "staff") return requestedBranchId

  const assignedBranchId = principal.assignedBranchId?.trim()
  if (!assignedBranchId) {
    throw new AdminBranchScopeError(
      "Staff account is not assigned to a valid branch."
    )
  }
  if (requestedBranchId && requestedBranchId !== assignedBranchId) {
    throw new AdminBranchScopeError()
  }
  return assignedBranchId
}

export function getBookingBranchScope(
  principal: BranchScopedPrincipal,
  requestedBranchId?: string
): Prisma.BookingWhereInput {
  const branchId = resolveAdminBranchId(principal, requestedBranchId)
  return branchId ? { branchId } : {}
}
