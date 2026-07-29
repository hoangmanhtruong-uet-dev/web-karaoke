import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
export const metadata: Metadata = pageMetadata("Gallery", "Không gian và trải nghiệm phòng hát Royal Karaoke.", "/gallery")
export default function Layout({ children }: { children: React.ReactNode }) { return children }
