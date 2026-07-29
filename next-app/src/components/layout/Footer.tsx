import Link from "next/link"
import { Clock, MapPin, Phone } from "lucide-react"
import { branches } from "@/data/branches"
import { brand, contactInfo } from "@/data/site"

const quickLinks = [
  { name: "Trang chủ", href: "/" },
  { name: "Phòng hát", href: "/rooms" },
  { name: "Menu", href: "/menu" },
  { name: "Chi nhánh", href: "/branches" },
  { name: "Ưu đãi", href: "/promotions" },
  { name: "Liên hệ", href: "/contact" },
]

export default function Footer() {
  return (
    <footer className="relative border-t border-gold/15 bg-[#05060a]/90">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgb(214_180_106_/_0.10),transparent_28rem)]" />

      <div className="container-custom relative py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Introduction */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              <h2 className="font-heading text-3xl font-bold text-gold">
                {brand.name}
              </h2>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              {brand.description}
            </p>
            <div className="mt-6 rounded-2xl border border-gold/15 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 text-gold-soft">
                <Phone size={18} />
                <span className="text-sm font-medium">Hotline</span>
              </div>
              <a
                href={contactInfo.hotlineHref}
                className="mt-2 block font-heading text-2xl font-bold text-gold"
              >
                {contactInfo.hotline}
              </a>
            </div>
          </div>

          {/* Branches */}
          <div>
            <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-gold">
              Chi nhánh
            </h3>
            <ul className="mt-5 space-y-4">
              {branches.map((branch) => (
                <li key={branch.id} className="flex gap-3">
                  <MapPin size={16} className="mt-1 shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {branch.name.split(" - ").slice(1).join(" - ")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {branch.district}, {branch.city}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-gold">
              Link nhanh
            </h3>
            <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-1">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors duration-300 hover:text-gold"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-gold">
              Giờ mở cửa
            </h3>
            <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3 text-gold-soft">
                <Clock size={18} />
                <span className="text-sm font-medium">Mỗi ngày</span>
              </div>
              <p className="mt-4 font-heading text-3xl font-bold text-foreground">
                {contactInfo.openingHours}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Hỗ trợ đặt phòng và phục vụ khách hàng xuyên suốt khung giờ hoạt động.
              </p>
            </div>

            <Link
              href="/booking"
              className="luxury-button mt-5 w-full"
            >
              Đặt phòng ngay
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-gold/10 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p className="text-gold-soft">{brand.tagline}</p>
        </div>
      </div>
    </footer>
  )
}