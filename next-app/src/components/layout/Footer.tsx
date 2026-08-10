import Link from "next/link"
import { brand } from "@/data/site"

const branchesList = [
  { name: "Trung Tâm (Q1)" },
  { name: "Sài Gòn Pearl (Bình Thạnh)" },
  { name: "Landmark 81 (Bình Thạnh)" },
  { name: "Phú Mỹ Hưng (Q7)" },
]

const quickLinks = [
  { name: "Về chúng tôi", href: "/about" },
  { name: "Chính sách bảo mật", href: "/privacy" },
  { name: "Điều khoản sử dụng", href: "/terms" },
  { name: "Liên hệ hợp tác", href: "/contact" },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#07080c] py-16">
      <div className="container-custom">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Column 1: Brand Info & Copyright */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              <Link href="/" className="inline-block">
                <h2 className="font-heading text-3xl font-bold text-gold">
                  {brand.name}
                </h2>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-400">
                Royal Karaoke mang đến không gian giải trí đẳng cấp với phòng hát sang trọng, âm thanh hiện đại và dịch vụ tận tâm cho mọi cuộc vui.
              </p>
            </div>
            
            <div className="mt-8 text-xs text-zinc-500 space-y-1">
              <p>© 2026 Royal Karaoke. All rights reserved.</p>
              <p>Luxury sound - Private room - Premium service</p>
            </div>
          </div>

          {/* Column 2: Branches */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Chi nhánh
            </h3>
            <ul className="mt-5 space-y-3.5">
              {branchesList.map((branch, i) => (
                <li key={i} className="text-sm text-zinc-400">
                  {branch.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Liên kết
            </h3>
            <ul className="mt-5 space-y-3.5">
              {quickLinks.map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 transition-colors duration-200 hover:text-gold"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}