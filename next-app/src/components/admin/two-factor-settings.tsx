"use client"

import { FormEvent, useState } from "react"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"

export function TwoFactorSettings() {
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setPending(true)
    setError("")
    const response = await fetch("/api/admin/me/2fa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: formData.get("password"),
        otp: formData.get("otp"),
        recoveryCode: formData.get("recoveryCode"),
      }),
    })
    const body = await response.json()
    if (!response.ok) {
      setPending(false)
      setError(body?.error?.message ?? "Không thể thay đổi 2FA.")
      return
    }
    await signOut({ callbackUrl: "/admin/login" })
  }

  return (
    <form onSubmit={disable} className="max-w-xl rounded-3xl border border-gold/20 bg-[#10131b] p-7">
      <h1 className="text-2xl font-bold">Xác thực hai lớp</h1>
      <p className="mt-3 text-sm">
        2FA đang bật. Để đặt lại thiết bị, hãy tắt bằng mật khẩu và một mã hợp lệ.
        Tất cả session hiện tại sẽ bị thu hồi; lần đăng nhập kế tiếp bắt buộc thiết lập lại.
      </p>
      <div className="mt-6 grid gap-3">
        <input name="password" type="password" autoComplete="current-password" required className="h-12 rounded-xl border border-white/10 bg-black/30 px-4" placeholder="Mật khẩu hiện tại" />
        <input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" className="h-12 rounded-xl border border-white/10 bg-black/30 px-4" placeholder="Mã Authenticator" />
        <input name="recoveryCode" autoComplete="off" className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 uppercase" placeholder="Hoặc mã khôi phục" />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
      <Button type="submit" disabled={pending} className="mt-5 border border-rose-300/30 bg-rose-500/10 text-rose-100">
        {pending ? "Đang xử lý..." : "Tắt / đặt lại 2FA"}
      </Button>
    </form>
  )
}
