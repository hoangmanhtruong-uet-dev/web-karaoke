import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { hasPermission, isAdminRole, type AdminRole, type Permission } from "@/lib/permissions"
import prisma from "@/lib/prisma"

export type AdminPrincipal = {
  id: string
  name: string
  email: string
  role: AdminRole
  mustChangePassword: boolean
  twoFactorEnabled?: boolean
  twoFactorVerified?: boolean
  assignedBranchId?: string | null
}

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const session = await auth()
  if (!session?.user.id || typeof session.user.sessionVersion !== "number") return null

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      twoFactorEnabled: true,
      assignedBranchId: true,
      sessionVersion: true,
    },
  })
  if (!user?.isActive || !isAdminRole(user.role) || user.sessionVersion !== session.user.sessionVersion) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorVerified: session.user.twoFactorVerified,
    assignedBranchId: user.assignedBranchId,
  }
}

export async function requireAuthenticatedUser() {
  const principal = await getAdminPrincipal()
  if (!principal) redirect("/admin/login")
  return principal
}

export async function requireAdminPage() {
  return requireAuthenticatedUser()
}

export async function requirePermissionPage(permission: Permission) {
  const principal = await requireAuthenticatedUser()
  if (principal.mustChangePassword) redirect("/admin/change-password")
  if (!hasPermission(principal.role, permission)) redirect("/admin")
  return principal
}

export async function requireAdmin() {
  return requirePermissionPage("system.manage")
}
