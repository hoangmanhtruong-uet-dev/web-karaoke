import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
export const metadata: Metadata = pageMetadata("Liên hệ", "Liên hệ Royal Karaoke để được tư vấn phòng, menu và lịch đặt.", "/contact")
export default function Layout({ children }: { children: React.ReactNode }) { return children }
