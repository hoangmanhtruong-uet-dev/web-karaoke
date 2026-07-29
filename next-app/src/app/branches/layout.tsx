import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
export const metadata: Metadata = pageMetadata("Danh sách chi nhánh", "Tìm chi nhánh karaoke phù hợp tại TP. Hồ Chí Minh.", "/branches")
export default function Layout({ children }: { children: React.ReactNode }) { return children }
