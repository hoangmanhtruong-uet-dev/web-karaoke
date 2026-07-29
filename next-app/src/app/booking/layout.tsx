import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
export const metadata: Metadata = pageMetadata("Đặt phòng", "Gửi yêu cầu đặt phòng và nhận tư vấn từ Royal Karaoke.", "/booking")
export default function Layout({ children }: { children: React.ReactNode }) { return children }
