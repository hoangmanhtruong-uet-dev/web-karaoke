import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
export const metadata: Metadata = pageMetadata("Menu", "Xem đồ ăn, thức uống và combo đang phục vụ.", "/menu")
export default function Layout({ children }: { children: React.ReactNode }) { return children }
