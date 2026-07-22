import { StaffManager } from "@/components/admin/staff-manager"
import { requirePermissionPage } from "@/lib/admin-auth"
import prisma from "@/lib/prisma"

export default async function StaffPage() {
  const admin = await requirePermissionPage("staff.read")
  const users = await prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
    },
  })
  return (
    <div>
      <p className="text-sm text-gold">Security administration</p>
      <h1 className="mt-1 font-heading text-3xl font-bold">Staff accounts</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Temporary passwords are displayed once. Role, lock, reset and session
        revocation actions are audited.
      </p>
      <div className="mt-6">
        <StaffManager users={users} currentUserId={admin.id} />
      </div>
    </div>
  )
}
