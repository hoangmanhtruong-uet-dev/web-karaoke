"use client"

import { FormEvent, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [secondFactor, setSecondFactor] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const formData = new FormData(event.currentTarget)
    setPending(true)
    setError("")
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      otp: formData.get("otp"),
      recoveryCode: formData.get("recoveryCode"),
      redirect: false,
    })
    setPending(false)
    if (result?.error) {
      setError("Thông tin đăng nhập không hợp lệ hoặc tài khoản đang bị khóa.")
      if (!secondFactor) {
        setSecondFactor(true)
        setError("Nếu đây là tài khoản ADMIN, nhập mã Authenticator hoặc mã khôi phục để tiếp tục.")
      } else {
        setError("Thông tin đăng nhập hoặc mã xác thực không hợp lệ.")
      }
      return
    }
    router.replace("/admin")
    router.refresh()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#07080c] px-4 py-24">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-gold/20 bg-[#10131b] p-7 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.25em] text-gold">Royal Admin</p>
        <h1 className="mt-3 font-heading text-3xl font-bold">Đăng nhập quản trị</h1>
        <div className="mt-7 space-y-4">
          <label className="block text-sm">Email<input name="email" type="email" autoComplete="username" required className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4" /></label>
          <label className="block text-sm">Mật khẩu<input name="password" type="password" autoComplete="current-password" minLength={12} required className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4" /></label>
        </div>
          {secondFactor && (
            <>
              <label className="block text-sm">Mã Authenticator
                <input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 tracking-[0.3em]" />
              </label>
              <label className="block text-sm">Hoặc mã khôi phục
                <input name="recoveryCode" autoComplete="off" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 uppercase" />
              </label>
            </>
          )}
        {error && <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p>}
        <Button type="submit" disabled={pending} className="luxury-button mt-6 h-12 w-full">{pending ? "Đang xác thực..." : "Đăng nhập"}</Button>
      </form>
    </main>
  )
}
