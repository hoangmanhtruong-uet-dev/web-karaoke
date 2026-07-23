"use client"

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#07080c] text-white">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
          <h1 className="text-3xl font-semibold">
            T?m th?i kh?ng th? hi?n th? trang
          </h1>
          <p className="text-white/70">
            Vui l?ng ki?m tra k?t n?i v? th? l?i. Kh?ng c? d? li?u k? thu?t n?i
            b? ???c hi?n th?.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full bg-white px-5 py-3 font-medium text-black"
          >
            Th? l?i
          </button>
        </main>
      </body>
    </html>
  )
}
