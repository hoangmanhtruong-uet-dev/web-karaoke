import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
export const metadata: Metadata = pageMetadata("Phòng hát", "Khám phá các hạng phòng và tiện ích karaoke.", "/rooms")
export default function Layout({ children }: { children: React.ReactNode }) { return children }
