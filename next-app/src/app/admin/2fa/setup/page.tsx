import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { TwoFactorSetup } from "@/components/admin/two-factor-setup"
import prisma from "@/lib/prisma"

export default async function TwoFactorSetupPage() {
  const session = await auth()
  if (!session?.user.id || session.user.role !== "admin")
    redirect("/admin/login")
  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, twoFactorEnabled: true, sessionVersion: true },
  })
  if (!user?.isActive || user.sessionVersion !== session.user.sessionVersion)
    redirect("/admin/login")
  if (user.twoFactorEnabled) redirect("/admin")

  return (
    <main className="grid min-h-screen place-items-center bg-[#07080c] px-4 py-24">
      <div className="w-full max-w-lg">
        <TwoFactorSetup />
      </div>
    </main>
  )
}
