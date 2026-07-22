"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export function ChangePasswordForm() {
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  return <form className="mt-6 grid gap-4" onSubmit={async (event) => {
    event.preventDefault()
    setPending(true)
    setError("")
    const data = new FormData(event.currentTarget)
    const response = await fetch("/api/admin/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
      setError(body?.error?.message ?? "Unable to change password.")
      setPending(false)
      return
    }
    await signOut({ callbackUrl: "/admin/login" })
  }}>
    <label className="grid gap-2 text-sm">Current password<input name="currentPassword" type="password" autoComplete="current-password" required className="rounded-xl bg-black/30 px-3 py-2" /></label>
    <label className="grid gap-2 text-sm">New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required className="rounded-xl bg-black/30 px-3 py-2" /></label>
    <p className="text-xs text-muted-foreground">At least 12 characters with uppercase, lowercase and a number.</p>
    {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
    <button disabled={pending} className="rounded-xl bg-gold px-4 py-3 font-semibold text-black">{pending ? "Changing..." : "Change password"}</button>
  </form>
}
