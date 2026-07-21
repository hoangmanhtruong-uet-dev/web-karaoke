"use client"

import { usePathname } from "next/navigation"

import Footer from "@/components/layout/Footer"
import Header from "@/components/layout/Header"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-[#07080c]">{children}</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
