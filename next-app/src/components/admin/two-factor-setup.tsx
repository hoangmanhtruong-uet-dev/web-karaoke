"use client"

import { FormEvent, useState } from "react"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"

type Enrollment = { qrDataUrl: string; manualKey: string }

export function TwoFactorSetup() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>, action: "begin" | "confirm") {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setPending(true)
    setError("")
    const response = await fetch("/api/admin/me/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        password: formData.get("password"),
        ...(action === "confirm" ? { otp: formData.get("otp") } : {}),
      }),
    })
    const body = await response.json()
    setPending(false)
    if (!response.ok) {
      setError(body?.error?.message ?? "Không thể cập nhật xác thực hai lớp.")
      return
    }
    if (action === "begin") setEnrollment(body.data)
    else setRecoveryCodes(body.data.recoveryCodes)
  }

  if (recoveryCodes) {
    return (
      <section className="rounded-3xl border border-emerald-300/20 bg-[#10131b] p-7">
        <h1 className="text-2xl font-bold">2FA đã được bật</h1>
        <p className="mt-3 text-sm">
          Lưu các mã khôi phục này ngay. Mỗi mã chỉ dùng một lần và sẽ không được hiển thị lại.
        </p>
        <pre className="mt-5 grid gap-2 rounded-2xl bg-black/40 p-5 text-center text-sm">
          {recoveryCodes.join("\n")}
        </pre>
        <Button
          className="luxury-button mt-6"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          Tôi đã lưu mã — đăng nhập lại
        </Button>
      </section>
    )
  }

  if (!enrollment) {
    return (
      <form onSubmit={(event) => submit(event, "begin")} className="rounded-3xl border border-gold/20 bg-[#10131b] p-7">
        <h1 className="text-2xl font-bold">Bắt buộc thiết lập 2FA</h1>
        <p className="mt-3 text-sm">
          Nhập lại mật khẩu để tạo khóa TOTP. Khóa không được gửi qua email.
        </p>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-6 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4"
          placeholder="Mật khẩu hiện tại"
        />
        {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
        <Button disabled={pending} className="luxury-button mt-5 w-full">
          {pending ? "Đang tạo..." : "Bắt đầu thiết lập"}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={(event) => submit(event, "confirm")} className="rounded-3xl border border-gold/20 bg-[#10131b] p-7">
      <h1 className="text-2xl font-bold">Quét QR bằng ứng dụng Authenticator</h1>
      {/* QR is generated locally from the pending secret and is never logged. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- QR is a generated data URL. */}
      <img src={enrollment.qrDataUrl} alt="QR thiết lập TOTP" className="mx-auto mt-5 size-64 rounded-xl bg-white p-2" />
      <p className="mt-4 break-all text-xs">Khóa nhập thủ công: {enrollment.manualKey}</p>
      <div className="mt-5 grid gap-3">
        <input name="password" type="password" autoComplete="current-password" required className="h-12 rounded-xl border border-white/10 bg-black/30 px-4" placeholder="Nhập lại mật khẩu" />
        <input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 tracking-[0.3em]" placeholder="Mã 6 chữ số" />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
      <Button disabled={pending} className="luxury-button mt-5 w-full">
        {pending ? "Đang xác nhận..." : "Xác nhận và bật 2FA"}
      </Button>
    </form>
  )
}
