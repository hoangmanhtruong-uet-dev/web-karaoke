import { ChangePasswordForm } from "@/components/admin/change-password-form"
import { requireAuthenticatedUser } from "@/lib/admin-auth"

export default async function ChangePasswordPage() {
  await requireAuthenticatedUser()
  return <main className="grid min-h-screen place-items-center bg-[#07080c] p-4"><section className="w-full max-w-md rounded-3xl border border-gold/20 bg-[#0d1017] p-7"><p className="text-sm uppercase tracking-[0.25em] text-gold">Security</p><h1 className="mt-3 font-heading text-3xl font-bold">Change password</h1><p className="mt-2 text-sm text-muted-foreground">Changing your password revokes every existing session.</p><ChangePasswordForm /></section></main>
}
