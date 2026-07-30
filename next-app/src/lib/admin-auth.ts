import type { Session } from "next-auth"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { apiError } from "@/lib/api-response"
import {
  hasPermission,
  isAdminRole,
  type AdminRole,
  type Permission,
} from "@/lib/permissions"
import { logger } from "@/lib/logger"
import prisma from "@/lib/prisma"
import { writeSecurityAudit } from "@/lib/security-audit"

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

export type AdminTwoFactorPrincipal = AdminPrincipal & {
  passwordHash: string
  sessionVersion: number
  twoFactorSecret: string | null
  twoFactorPendingSecret: string | null
  twoFactorLastUsedStep: number | null
}

type SessionUser = {
  id: string
  sessionVersion: number
  twoFactorVerified?: boolean
}

type PrincipalUser = {
  id: string
  name: string
  email: string
  role: unknown
  isActive: boolean
  mustChangePassword: boolean
  twoFactorEnabled: boolean
  assignedBranchId: string | null
  sessionVersion: number
}

type PrincipalValidation<User extends PrincipalUser> =
  | { ok: true; principal: AdminPrincipal; user: User }
  | {
      ok: false
      reason:
        | "invalid_session"
        | "inactive_account"
        | "invalid_role"
        | "revoked_session"
      user?: User
    }

function sessionUser(session: Session | null): SessionUser | null {
  if (!session?.user.id || typeof session.user.sessionVersion !== "number")
    return null
  return {
    id: session.user.id,
    sessionVersion: session.user.sessionVersion,
    twoFactorVerified: session.user.twoFactorVerified,
  }
}

function validatePrincipal<User extends PrincipalUser>(
  session: SessionUser | null,
  user: User | null
): PrincipalValidation<User> {
  if (!session || !user) return { ok: false, reason: "invalid_session" }
  if (!user.isActive) return { ok: false, reason: "inactive_account", user }
  if (!isAdminRole(user.role))
    return { ok: false, reason: "invalid_role", user }
  if (user.sessionVersion !== session.sessionVersion)
    return { ok: false, reason: "revoked_session", user }
  return {
    ok: true,
    principal: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorVerified: session.twoFactorVerified,
      assignedBranchId: user.assignedBranchId,
    },
    user,
  }
}

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const session = await auth()
  const signedUser = sessionUser(session)
  if (!signedUser) return null

  const user = await prisma.adminUser.findUnique({
    where: { id: signedUser.id },
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
  const validation = validatePrincipal(signedUser, user)
  return validation.ok ? validation.principal : null
}

export async function authorizeAdminTwoFactorManagement(
  request: Request
): Promise<{ principal: AdminTwoFactorPrincipal } | { response: Response }> {
  const session = await auth()
  const signedUser = sessionUser(session)
  if (!signedUser) return { response: unauthorizedResponse() }

  const user = await prisma.adminUser.findUnique({
    where: { id: signedUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      assignedBranchId: true,
      sessionVersion: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorPendingSecret: true,
      twoFactorLastUsedStep: true,
    },
  })
  const validation = validatePrincipal(signedUser, user)
  if (!validation.ok) {
    if (validation.reason === "revoked_session" && validation.user) {
      await writeSecurityAudit({
        actorId: validation.user.id,
        actorRole: isAdminRole(validation.user.role)
          ? validation.user.role
          : "unknown",
        action: "auth.revokedSessionRejected",
        entityType: "adminUser",
        entityId: validation.user.id,
        result: "blocked",
        request,
      }).catch((error: unknown) => {
        logger.error("security_audit_write_failed", {
          errorCode:
            error instanceof Error ? error.constructor.name : "UNKNOWN",
        })
      })
    }
    return { response: unauthorizedResponse() }
  }
  if (
    validation.principal.mustChangePassword ||
    !hasPermission(validation.principal.role, "system.manage")
  ) {
    return { response: forbiddenResponse() }
  }
  if (
    validation.user.twoFactorEnabled &&
    validation.principal.twoFactorVerified !== true
  ) {
    return { response: unauthorizedResponse() }
  }
  return {
    principal: {
      ...validation.principal,
      passwordHash: validation.user.passwordHash,
      sessionVersion: validation.user.sessionVersion,
      twoFactorSecret: validation.user.twoFactorSecret,
      twoFactorPendingSecret: validation.user.twoFactorPendingSecret,
      twoFactorLastUsedStep: validation.user.twoFactorLastUsedStep,
    },
  }
}

function unauthorizedResponse() {
  return apiError(401, "UNAUTHORIZED", "Authentication required.")
}

function forbiddenResponse() {
  return apiError(
    403,
    "FORBIDDEN",
    "You do not have permission for this operation."
  )
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
