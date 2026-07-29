import { redirect } from "next/navigation"

import { TwoFactorSettings } from "@/components/admin/two-factor-settings"
import { requireAdmin } from "@/lib/admin-auth"

export default async function TwoFactorSettingsPage() {
  const admin = await requireAdmin()
  if (!admin.twoFactorEnabled) redirect("/admin/2fa/setup")
  return <TwoFactorSettings />
}
