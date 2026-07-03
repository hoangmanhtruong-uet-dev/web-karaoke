"use client"

import Link from "next/link"
import { Phone } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { brand, contactInfo, mobileContactHighlights, navItems } from "@/data/site"

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="border-l border-gold/20 bg-[#090b11]/95 px-0 py-0 backdrop-blur-2xl"
      >
        <SheetHeader className="border-b border-gold/10 px-6 py-6 text-left">
          <SheetTitle className="font-heading text-2xl font-bold text-gold">
            {brand.name}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {brand.shortDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col px-6 py-6">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <SheetClose key={item.name} asChild>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-transparent px-4 py-3 text-base font-medium text-foreground transition-all duration-300 hover:border-gold/20 hover:bg-gold/10 hover:text-gold"
                >
                  {item.name}
                  <span className="h-px w-6 bg-gold/40" />
                </Link>
              </SheetClose>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-gold/15 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-3 text-gold-soft">
              <Phone size={18} />
              <span className="text-sm font-semibold">Hotline đặt phòng</span>
            </div>
            <a
              href={contactInfo.hotlineHref}
              className="font-heading text-2xl font-bold text-gold"
            >
              {contactInfo.hotline}
            </a>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {mobileContactHighlights.map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <item.icon size={16} className="text-gold" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <SheetClose asChild>
            <Button asChild className="luxury-button mt-6 h-12 text-base">
              <Link href="/booking">Đặt phòng ngay</Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}