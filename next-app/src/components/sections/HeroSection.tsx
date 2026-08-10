"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Lock, Sliders, ShieldCheck, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

const stats = [
  { 
    icon: Lock, 
    value: "Riêng tư", 
    label: "Không gian phòng hát" 
  }, 
  { 
    icon: Sliders, 
    value: "Linh hoạt", 
    label: "Tư vấn theo nhu cầu" 
  }, 
  { 
    icon: ShieldCheck, 
    value: "Minh bạch", 
    label: "Thông tin dịch vụ" 
  }, 
  { 
    icon: Heart, 
    value: "Tận tâm", 
    label: "Hỗ trợ đặt phòng" 
  }
]

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden py-24 sm:py-32 lg:py-40">
      {/* Background image & gradient overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-bg.png"
          alt="Royal Karaoke Lounge"
          fill
          priority
          className="object-cover opacity-35 select-none pointer-events-none"
        />
        {/* Gradients to darken background and blend edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#07080c_90%)]" />
      </div>

      <div className="container-custom relative z-10 w-full">
        <div className="max-w-4xl">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4.75rem]"
          >
            Karaoke lounge đẳng cấp
            <br />
            <span className="gold-gradient-text font-heading">
              cho những đêm thăng hoa
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg lg:text-xl lg:leading-9"
          >
            Bước vào không gian phòng hát riêng tư, ánh sáng sân khấu tinh tế,
            âm thanh cao cấp và dịch vụ chuẩn lounge cho mọi buổi gặp gỡ.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: "easeOut" }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Button asChild className="luxury-button h-12 px-8 text-sm uppercase tracking-wider font-semibold">
              <Link href="/booking">
                Đặt phòng ngay
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="luxury-button-outline h-12 px-8 text-sm uppercase tracking-wider font-semibold"
            >
              <Link href="/menu">Xem menu</Link>
            </Button>
          </motion.div>

          {/* Feature Grid */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.36, ease: "easeOut" }}
            className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:max-w-5xl"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/40 p-4.5 backdrop-blur-md hover:border-gold/30 hover:bg-black/50 transition-all duration-300 group"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold group-hover:bg-gold group-hover:text-black transition-all duration-300">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-semibold text-white tracking-wide">
                    {s.value}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-normal">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}