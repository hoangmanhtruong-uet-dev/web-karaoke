"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type StaffUser = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: Date | null
}

export function StaffManager({
  users,
  currentUserId,
}: {
  users: StaffUser[]
  currentUserId: string
}) {
  const router = useRouter()
  const stepUpPasswordRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState("")
  const [temporaryPassword, setTemporaryPassword] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!temporaryPassword) return
    const timeout = window.setTimeout(() => {
      setTemporaryPassword("")
      setMessage("Temporary password cleared.")
    }, 30_000)
    return () => window.clearTimeout(timeout)
  }, [temporaryPassword])

  async function mutate(
    url: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    requiresStepUp = false
  ) {
    const currentPassword = stepUpPasswordRef.current?.value ?? ""
    if (requiresStepUp && !currentPassword) {
      setMessage(
        "Enter your current admin password before this sensitive operation."
      )
      return
    }

    setPending(true)
    setMessage("")
    setTemporaryPassword("")
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          requiresStepUp ? { ...body, currentPassword } : body
        ),
      })
      const payload = (await response.json().catch(() => null)) as {
        data?: { temporaryPassword?: string }
        error?: { message?: string }
      } | null
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "Operation failed.")
        return
      }
      if (payload?.data?.temporaryPassword) {
        setTemporaryPassword(payload.data.temporaryPassword)
        setMessage("Temporary password is visible for 30 seconds.")
      } else {
        setMessage("Saved.")
      }
      router.refresh()
    } catch {
      setMessage("Operation failed.")
    } finally {
      setPending(false)
      if (requiresStepUp && stepUpPasswordRef.current)
        stepUpPasswordRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <label className="grid max-w-md gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm">
        Current admin password
        <input
          ref={stepUpPasswordRef}
          type="password"
          autoComplete="current-password"
          maxLength={200}
          placeholder="Required for privileged account changes"
          className="rounded-xl bg-black/30 px-3 py-2"
        />
        <span className="text-xs text-muted-foreground">
          Required to create or promote an admin, reset a password, or
          lock/demote an admin.
        </span>
      </label>

      <form
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const role = String(data.get("role"))
          void mutate(
            "/api/admin/staff",
            "POST",
            { name: data.get("name"), email: data.get("email"), role },
            role === "admin"
          )
          event.currentTarget.reset()
        }}
      >
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Full name"
          className="rounded-xl bg-black/30 px-3 py-2"
        />
        <input
          name="email"
          type="email"
          required
          maxLength={255}
          placeholder="Email"
          className="rounded-xl bg-black/30 px-3 py-2"
        />
        <select name="role" className="rounded-xl bg-black/30 px-3 py-2">
          <option value="staff">STAFF</option>
          <option value="manager">MANAGER</option>
          <option value="admin">ADMIN</option>
        </select>
        <button
          disabled={pending}
          className="rounded-xl bg-gold px-4 py-2 font-semibold text-black"
        >
          Create account
        </button>
      </form>

      {message && (
        <p className="rounded-xl border border-gold/20 bg-gold/10 p-3 text-sm text-gold">
          {message}
        </p>
      )}
      {temporaryPassword && (
        <output className="block break-all rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 font-mono text-sm text-amber-100">
          {temporaryPassword}
        </output>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-white/5">
            <tr>
              {[
                "Employee",
                "Role",
                "Status",
                "Password",
                "Last login",
                "Actions",
              ].map((item) => (
                <th key={item} className="p-3">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              return (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="p-3">
                    <b>{user.name}</b>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      disabled={pending || isSelf}
                      value={user.role}
                      onChange={(event) => {
                        const role = event.target.value
                        void mutate(
                          `/api/admin/staff/${user.id}`,
                          "PATCH",
                          { action: "setRole", role },
                          role === "admin" || user.role === "admin"
                        )
                      }}
                      className="rounded-lg bg-black/30 p-2"
                    >
                      <option value="staff">STAFF</option>
                      <option value="manager">MANAGER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-3">{user.isActive ? "Active" : "Locked"}</td>
                  <td className="p-3">
                    {user.mustChangePassword ? "Must change" : "Current"}
                  </td>
                  <td className="p-3">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("vi-VN")
                      : "Never"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={pending || isSelf}
                        onClick={() =>
                          void mutate(
                            `/api/admin/staff/${user.id}`,
                            "PATCH",
                            { action: "setActive", isActive: !user.isActive },
                            user.role === "admin" && user.isActive
                          )
                        }
                        className="rounded-lg border border-white/15 px-3 py-1"
                      >
                        {user.isActive ? "Lock" : "Unlock"}
                      </button>
                      <button
                        disabled={pending}
                        onClick={() =>
                          void mutate(`/api/admin/staff/${user.id}`, "PATCH", {
                            action: "revokeSessions",
                          })
                        }
                        className="rounded-lg border border-white/15 px-3 py-1"
                      >
                        Revoke sessions
                      </button>
                      <button
                        disabled={pending || isSelf}
                        onClick={() =>
                          void mutate(
                            `/api/admin/staff/${user.id}`,
                            "PATCH",
                            { action: "resetPassword" },
                            true
                          )
                        }
                        className="rounded-lg border border-white/15 px-3 py-1"
                      >
                        Reset password
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
