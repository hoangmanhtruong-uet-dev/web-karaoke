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

export const brand = {
  name: "Royal Karaoke",
  shortDescription:
    "Không gian giải trí sang trọng, âm thanh đỉnh cao và dịch vụ chuẩn VIP.",
  description:
    "Royal Karaoke mang đến không gian giải trí đẳng cấp với phòng hát sang trọng, âm thanh hiện đại và dịch vụ tận tâm cho mọi cuộc vui.",
  tagline: "Luxury sound • Private room • Premium service",
} as const

export const contactInfo = {
  hotline: "028 3822 6688",
  hotlineHref: "tel:02838226688",
  branchSummary: "4 chi nhánh tại TP. Hồ Chí Minh",
  openingHours: "09:00 - 06:00",
} as const

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