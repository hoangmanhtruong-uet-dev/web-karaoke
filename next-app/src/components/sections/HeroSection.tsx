"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const stats = [{ value: "Riêng tư", label: "Không gian phòng hát" }, { value: "Linh hoạt", label: "Tư vấn theo nhu cầu" }, { value: "Minh bạch", label: "Thông tin dịch vụ" }, { value: "Tận tâm", label: "Hỗ trợ đặt phòng" }]

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#030407_0%,#090a10_42%,#111017_72%,#07080c_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_14%,rgb(214_180_106_/_0.22),transparent_38%),radial-gradient(ellipse_at_80%_18%,rgb(73_83_105_/_0.18),transparent_34%),radial-gradient(ellipse_at_70%_78%,rgb(156_120_53_/_0.12),transparent_42%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07080c] to-transparent" />
      <div className="absolute left-1/2 top-[-18%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />

      {/* Abstract stage lights / private lounge visual */}
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 top-12 h-[34rem] w-40 rotate-[18deg] bg-gradient-to-b from-gold/18 via-gold/5 to-transparent blur-3xl sm:left-10" />
        <div className="absolute right-0 top-10 h-[38rem] w-44 -rotate-[16deg] bg-gradient-to-b from-white/10 via-gold/6 to-transparent blur-3xl sm:right-24" />
        <div className="absolute bottom-20 right-[8%] hidden h-80 w-80 rounded-full border border-gold/10 bg-[radial-gradient(circle,rgb(214_180_106_/_0.08),transparent_64%)] shadow-[0_0_90px_rgba(214,180,106,0.08)] lg:block" />
        <div className="absolute bottom-28 right-[14%] hidden h-48 w-48 rounded-full border border-white/5 bg-black/20 backdrop-blur-sm lg:block" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(214,180,106,0.06)_1px,transparent_1px),linear-gradient(rgba(214,180,106,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.16]" />
      </div>

      <div className="container-custom relative z-10 py-28 sm:py-36 lg:py-44">
        <div className="max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="font-heading text-[2.9rem] font-bold leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-8xl"
          >
            Karaoke lounge{" "}
            <span className="gold-gradient-text">đẳng cấp</span>
            <br />
            cho những đêm thăng hoa
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
            className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg lg:text-xl lg:leading-9"
          >
            Bước vào không gian phòng hát riêng tư, ánh sáng sân khấu tinh tế,
            âm thanh cao cấp và dịch vụ chuẩn lounge cho mọi buổi gặp gỡ.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: "easeOut" }}
            className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap"
          >
            <Button asChild className="luxury-button h-13 px-9 text-base">
              <Link href="/booking">
                Đặt phòng ngay
                <ChevronRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="luxury-button-outline h-13 px-9 text-base"
            >
              <Link href="/menu">Xem menu</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.36, ease: "easeOut" }}
            className="mt-14 grid grid-cols-2 gap-4 border-t border-gold/15 pt-6 sm:grid-cols-4 sm:gap-6 lg:max-w-3xl"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4 backdrop-blur-md"
              >
                <div className="font-heading text-2xl font-bold text-gold-soft sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}