import type { Metadata } from "next"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: `Quản trị ${siteConfig.brandName}`,
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
