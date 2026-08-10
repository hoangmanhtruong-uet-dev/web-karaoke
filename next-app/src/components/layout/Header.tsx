"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MenuIcon, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { brand, contactInfo, navItems } from "@/data/site"
import MobileNav from "./MobileNav"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "glass-panel-blur border-b border-gold/10 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container-custom flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl font-bold tracking-tight text-gold transition-colors duration-300 group-hover:text-gold-soft">
                {brand.name}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
            {navItems
              .filter((item) => ["Trang chủ", "Phòng hát", "Menu", "Chi nhánh", "Ưu đãi"].includes(item.name))
              .map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative px-4 py-2 text-sm font-medium text-gold-soft transition-colors duration-300 hover:text-gold"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-1/2 hidden h-0.5 w-0 -translate-x-1/2 rounded-full bg-gold transition-all duration-300 group-hover:block group-hover:w-full" />
                </Link>
              ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden items-center gap-3 lg:flex">
            <Button asChild className="luxury-button h-10 px-5 text-base">
              <Link href="/booking">Đặt phòng ngay</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex size-11 items-center justify-center rounded-full border border-gold/20 bg-surface/70 text-gold shadow-lg shadow-black/20 transition hover:bg-surface lg:hidden"
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Sheet */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  )
}