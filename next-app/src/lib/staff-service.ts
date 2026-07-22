import { randomBytes } from "node:crypto"

import { Prisma } from "@prisma/client"
import { compare, hash } from "bcryptjs"
import { z } from "zod"

import type { AdminPrincipal } from "@/lib/admin-auth"
import { ADMIN_ROLES } from "@/lib/permissions"
import { currentPasswordSchema } from "@/lib/password-policy"
import prisma from "@/lib/prisma"
import { requestContext } from "@/lib/request-context"

export const createStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z
      .string()
      .trim()
      .email()
      .max(255)
      .transform((value) => value.toLowerCase()),
    role: z.enum(ADMIN_ROLES),
    currentPassword: currentPasswordSchema.optional(),
  })
  .strict()

export const staffActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("setRole"),
      role: z.enum(ADMIN_ROLES),
      currentPassword: currentPasswordSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("setActive"),
      isActive: z.boolean(),
      currentPassword: currentPasswordSchema.optional(),
    })
    .strict(),
  z.object({ action: z.literal("revokeSessions") }).strict(),
  z
    .object({
      action: z.literal("resetPassword"),
      currentPassword: currentPasswordSchema.optional(),
    })
    .strict(),
])

export class StaffSecurityError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "StaffSecurityError"
  }
}

function temporaryPassword() {
  return `Tmp-${randomBytes(15).toString("base64url")}9aA`
}

async function assertStepUpTx(
  tx: Prisma.TransactionClient,
  actor: AdminPrincipal,
  currentPassword?: string
) {
  if (!currentPassword) {
    throw new StaffSecurityError(
      403,
      "REAUTHENTICATION_REQUIRED",
      "Current password verification is required for this operation."
    )
  }
  const rows = await tx.$queryRaw<
    Array<{ passwordHash: string; role: string; isActive: boolean }>
  >`
    SELECT "passwordHash", "role"::text AS "role", "isActive"
    FROM "AdminUser"
    WHERE "id" = ${actor.id}
    FOR UPDATE
  `
  const account = rows[0]
  if (
    !account?.isActive ||
    account.role !== actor.role ||
    !(await compare(currentPassword, account.passwordHash))
  ) {
    throw new StaffSecurityError(
      403,
      "REAUTHENTICATION_REQUIRED",
      "Current password verification is required for this operation."
    )
  }
}

async function assertAdminInvariantTx(
  tx: Prisma.TransactionClient,
  targetId: string,
  actor: AdminPrincipal,
  nextRole?: string,
  nextActive?: boolean
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('active-admin-invariant', 0))`
  const target = await tx.adminUser.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, isActive: true },
  })
  if (!target)
    throw new StaffSecurityError(
      404,
      "STAFF_NOT_FOUND",
      "Staff account not found."
    )
  if (
    target.id === actor.id &&
    (nextRole !== undefined || nextActive === false)
  )
    throw new StaffSecurityError(
      403,
      "SELF_PRIVILEGE_CHANGE",
      "You cannot change your own role or disable your own account."
    )
  const removesActiveAdmin =
    target.role === "admin" &&
    target.isActive &&
    ((nextRole !== undefined && nextRole !== "admin") || nextActive === false)
  if (
    removesActiveAdmin &&
    (await tx.adminUser.count({ where: { role: "admin", isActive: true } })) <=
      1
  )
    throw new StaffSecurityError(
      409,
      "LAST_ADMIN",
      "The last active admin cannot be removed."
    )
  return target
}

export async function createStaff(
  input: z.infer<typeof createStaffSchema>,
  actor: AdminPrincipal,
  request?: Request
) {
  const context = requestContext(request)
  const { currentPassword, ...accountInput } = input
  const password = temporaryPassword()
  try {
    const user = await prisma.$transaction(async (tx) => {
      if (accountInput.role === "admin")
        await assertStepUpTx(tx, actor, currentPassword)
      const passwordHash = await hash(password, 12)
      const created = await tx.adminUser.create({
        data: {
          ...accountInput,
          passwordHash,
          mustChangePassword: true,
          sessionVersion: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "staff.created",
          entityType: "adminUser",
          entityId: created.id,
          newValue: { role: created.role, isActive: created.isActive },
          result: "success",
          ...context,
        },
      })
      return created
    })
    return { user, temporaryPassword: password }
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new StaffSecurityError(
        409,
        "EMAIL_EXISTS",
        "An account with this email already exists."
      )
    }
    throw error
  }
}

export async function updateStaff(
  targetId: string,
  action: z.infer<typeof staffActionSchema>,
  actor: AdminPrincipal,
  request?: Request
) {
  const context = requestContext(request)
  if (action.action === "setRole") {
    const user = await prisma.$transaction(async (tx) => {
      const target = await assertAdminInvariantTx(
        tx,
        targetId,
        actor,
        action.role
      )
      if (
        action.role !== target.role &&
        (action.role === "admin" || target.role === "admin")
      ) {
        await assertStepUpTx(tx, actor, action.currentPassword)
      }
      const updated = await tx.adminUser.update({
        where: { id: targetId },
        data: { role: action.role, sessionVersion: { increment: 1 } },
        select: { id: true, role: true, isActive: true },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "staff.roleChanged",
          entityType: "adminUser",
          entityId: targetId,
          oldValue: { role: target.role },
          newValue: { role: action.role },
          result: "success",
          ...context,
        },
      })
      return updated
    })
    return { user }
  }
  if (action.action === "setActive") {
    const user = await prisma.$transaction(async (tx) => {
      const target = await assertAdminInvariantTx(
        tx,
        targetId,
        actor,
        undefined,
        action.isActive
      )
      if (target.role === "admin" && target.isActive && !action.isActive) {
        await assertStepUpTx(tx, actor, action.currentPassword)
      }
      const updated = await tx.adminUser.update({
        where: { id: targetId },
        data: { isActive: action.isActive, sessionVersion: { increment: 1 } },
        select: { id: true, role: true, isActive: true },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: action.isActive ? "staff.unlocked" : "staff.locked",
          entityType: "adminUser",
          entityId: targetId,
          oldValue: { isActive: target.isActive },
          newValue: { isActive: action.isActive },
          result: "success",
          ...context,
        },
      })
      return updated
    })
    return { user }
  }
  if (action.action === "revokeSessions") {
    const user = await prisma.$transaction(async (tx) => {
      await assertAdminInvariantTx(tx, targetId, actor)
      const updated = await tx.adminUser.update({
        where: { id: targetId },
        data: { sessionVersion: { increment: 1 } },
        select: { id: true, role: true, isActive: true },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "staff.sessionsRevoked",
          entityType: "adminUser",
          entityId: targetId,
          result: "success",
          ...context,
        },
      })
      return updated
    })
    return { user }
  }
  if (targetId === actor.id) {
    throw new StaffSecurityError(
      403,
      "SELF_PASSWORD_RESET",
      "Use the change-password page to change your own password."
    )
  }
  const password = temporaryPassword()
  const user = await prisma.$transaction(async (tx) => {
    await assertAdminInvariantTx(tx, targetId, actor)
    await assertStepUpTx(tx, actor, action.currentPassword)
    const passwordHash = await hash(password, 12)
    const updated = await tx.adminUser.update({
      where: { id: targetId },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
      select: { id: true, role: true, isActive: true },
    })
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "staff.passwordReset",
        entityType: "adminUser",
        entityId: targetId,
        result: "success",
        ...context,
      },
    })
    return updated
  })
  return { user, temporaryPassword: password }
}
