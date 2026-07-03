"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { CalendarCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BookingCTA() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[radial-gradient(circle_at_20%_20%,rgb(241_220_163_/_0.2),transparent_35%),linear-gradient(135deg,#d6b46a_0%,#8a6326_42%,#08080b_100%)] p-8 shadow-2xl sm:p-12 lg:p-16"
        >
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold text-gold-soft backdrop-blur-md">
                <CalendarCheck className="size-4" />
                Đặt lịch nhanh
              </div>
              <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Sẵn sàng cho buổi hát hôm nay?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
                Giữ phòng trước để được tư vấn chi nhánh, hạng phòng và menu phù hợp nhất
                cho nhóm của bạn.
              </p>
            </div>

            <Button asChild className="luxury-button h-12 min-w-44 px-8 text-base">
<Link href="/booking">
                Đặt phòng ngay
                <ChevronRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}