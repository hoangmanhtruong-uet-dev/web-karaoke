"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { rooms } from "@/data/rooms"

const tierConfig = {
  standard: {
    label: "Tiêu chuẩn",
    gradient: "from-slate-900 to-slate-800",
    border: "border-slate-700",
  },
  vip: {
    label: "VIP",
    gradient: "from-amber-950 to-amber-900",
    border: "border-amber-900",
  },
  luxury: {
    label: "Luxury",
    gradient: "from-gold/20 to-gold/10",
    border: "border-gold/30",
  },
}

const featuredRooms = [
  rooms.find((r) => r.tier === "standard")!,
  rooms.find((r) => r.tier === "vip")!,
  rooms.find((r) => r.tier === "presidential")!,
]

export default function FeaturedRooms() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-[#0b0d13] to-[#07080c]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgb(214_180_106/0.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgb(255_255_255/0.045),transparent_26%)]" />

      <div className="container-custom relative z-10">
        <div className="mx-auto mb-14 max-w-3xl text-center sm:mb-18">
          <p className="luxury-eyebrow mb-4">Không gian riêng tư</p>
          <h2 className="section-title">
            Phòng hát được thiết kế cho từng khoảnh khắc
          </h2>
          <p className="section-description mx-auto max-w-2xl">
            Từ buổi gặp thân mật đến tiệc VIP, mỗi phòng đều cân bằng giữa âm
            thanh, ánh sáng và sự riêng tư chuẩn lounge.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {featuredRooms.map((room) => {
            const tier = tierConfig[room.tier as keyof typeof tierConfig] || tierConfig.standard
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <Card
                  className={`luxury-card overflow-hidden p-0 ${tier.border} text-foreground`}
                >
                  <div className="relative h-56 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient}`} />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598997435713-5f21e3c64f32?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-45 mix-blend-soft-light transition-transform duration-700 hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/30 to-transparent" />
                    <div className="absolute left-5 top-5 rounded-full border border-gold/20 bg-black/35 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-gold-soft backdrop-blur-md">
                      {tier.label}
                    </div>
                  </div>
                  <CardHeader className="px-6 pt-6">
                    <CardTitle className="font-heading text-2xl tracking-tight text-foreground">
                      {room.name}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-muted-foreground">
                      {room.capacity.min} - {room.capacity.max} khách · Không gian riêng tư
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 px-6">
                    <div className="flex items-center justify-between rounded-2xl border border-gold/10 bg-white/[0.025] px-4 py-3 text-sm text-foreground">
                      <span className="flex items-center gap-2">
                        <Check className="size-4 text-gold" />
                        Giá phòng
                      </span>
                      <span className="font-semibold text-gold-soft">
                        {room.hourlyRate.toLocaleString("vi-VN")}đ/giờ
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {room.features.slice(0, 4).map((feature, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <div className="size-1.5 rounded-full bg-gold/60" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="luxury-button w-full" size="lg">
                      <Link href="/rooms">
                        Xem phòng
                        <ChevronRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
