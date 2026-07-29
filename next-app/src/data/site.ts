import type { LucideIcon } from "lucide-react"

import {
  CalendarCheck,
  Clock3,
  ConciergeBell,
  GalleryHorizontal,
  Home,
  MapPin,
  Menu as MenuIcon,
  Phone,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react"

import { siteConfig } from "@/config/site"

export { siteConfig }

export const brand = {
  name: siteConfig.brandName,
  shortDescription: siteConfig.shortDescription,
  description: siteConfig.description,
  tagline: siteConfig.tagline,
} as const

export const contactInfo = siteConfig

export type NavItem = {
  name: string
  href: string
  icon?: LucideIcon
}

export const navItems: NavItem[] = [
  { name: "Trang chủ", href: "/", icon: Home },
  { name: "Phòng hát", href: "/rooms", icon: Sparkles },
  { name: "Gallery", href: "/gallery", icon: GalleryHorizontal },
  { name: "Menu", href: "/menu", icon: MenuIcon },
  { name: "Chi nhánh", href: "/branches", icon: MapPin },
  { name: "Ưu đãi", href: "/promotions", icon: Utensils },
  { name: "Liên hệ", href: "/contact", icon: Phone },
]

export const bookingTrustItems = [
  {
    icon: ShieldCheck,
    title: "Không thanh toán trước",
    text: "Chỉ xác nhận giữ phòng",
  },
  {
    icon: ConciergeBell,
    title: "Có tư vấn hạng phòng",
    text: "Phù hợp số khách",
  },
  {
    icon: Clock3,
    title: "Phản hồi nhanh",
    text: "Qua điện thoại của bạn",
  },
] as const

export const mobileContactHighlights = [
  {
    icon: MapPin,
    text: contactInfo.branchSummary,
  },
  {
    icon: CalendarCheck,
    text: `Mở cửa ${contactInfo.openingHours} hằng ngày`,
  },
] as const