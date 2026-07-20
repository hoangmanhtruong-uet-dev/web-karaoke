import { redirect } from "next/navigation"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export type AdminPrincipal = {
  id: string
  name: string
  email: string
  role: "staff" | "admin"
}

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const session = await auth()
  if (!session?.user.id) return null

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
  if (!user?.isActive || (user.role !== "staff" && user.role !== "admin")) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export async function requireAdminPage() {
  const principal = await getAdminPrincipal()
  if (!principal) redirect("/admin/login")
  return principal
}
