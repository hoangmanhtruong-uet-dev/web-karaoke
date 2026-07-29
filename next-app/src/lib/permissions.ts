export const ADMIN_ROLES = ["staff", "manager", "admin"] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const PERMISSIONS = [
  "dashboard.read",
  "booking.read",
  "booking.update",
  "customer.read",
  "contact.read",
  "contact.update",
  "room.manage",
  "pricing.manage",
"service.manage",
  "payment.read",
  "payment.refund",
  "outbox.read",
  "outbox.retry",
  "staff.read",
  "staff.manage",
  "role.manage",
  "system.manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const STAFF_PERMISSIONS: readonly Permission[] = [
  "dashboard.read",
  "booking.read",
  "booking.update",
  "customer.read",
  "contact.read",
  "contact.update",
]

const MANAGER_PERMISSIONS: readonly Permission[] = [
  ...STAFF_PERMISSIONS,
  "room.manage",
  "pricing.manage",
"service.manage",
  "payment.read",
  "outbox.read",
]

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  staff: STAFF_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  admin: [...PERMISSIONS],
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole)
}

export function hasPermission(role: AdminRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission)
}
