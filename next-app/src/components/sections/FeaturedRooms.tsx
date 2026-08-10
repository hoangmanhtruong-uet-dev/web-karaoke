"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Check } from "lucide-react"

import SafeImage from "@/components/ui/SafeImage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { rooms } from "@/data/rooms"

const tierConfig = {
  standard: {
    label: "Tiêu chuẩn",
    badgeClass: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    isActive: false,
  },
  vip: {
    label: "VIP",
    badgeClass: "bg-red-500/10 text-red-400 border border-red-500/20",
    isActive: true,
  },
  premium: {
    label: "Premium",
    badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    isActive: false,
  },
  presidential: {
    label: "Tiêu chuẩn", // Display standard as per screenshot
    badgeClass: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    isActive: false,
  },
}

const featuredRooms = [
  rooms.find((r) => r.id === "room-04")!, // Phòng Ocean (standard)
  rooms.find((r) => r.id === "room-02")!, // Phòng Ruby (vip, highlighted)
  rooms.find((r) => r.id === "room-01")!, // Phòng Diamond (presidential)
]

export default function FeaturedRooms() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-[#07080c]">
      {/* Background radial soft light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgb(214_180_106/0.08),transparent_50%)] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="luxury-eyebrow mb-3">Không gian riêng tư</p>
          <h2 className="section-title">
            Phòng hát được thiết kế cho từng khoảnh khắc
          </h2>
          <p className="section-description mx-auto max-w-2xl text-zinc-400">
            Từ buổi gặp thân mật đến tiệc VIP, mỗi phòng đều cân bằng giữa âm
            thanh, ánh sáng và sự riêng tư chuẩn lounge.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuredRooms.map((room) => {
            const config = tierConfig[room.tier as keyof typeof tierConfig] || tierConfig.standard
            const isActive = config.isActive

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                viewport={{ once: true, margin: "-40px" }}
              >
                <Card
                  className={`relative overflow-hidden rounded-2xl bg-[#0e0f14] p-0 text-foreground transition-all duration-300 ${
                    isActive
                      ? "border-gold/40 shadow-[0_0_40px_rgba(214,180,106,0.12)] scale-[1.02]"
                      : "border-white/[0.06] hover:border-gold/20"
                  }`}
                >
                  {/* Room Image Container */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <SafeImage
                      src={room.imageUrl}
                      alt={`Ảnh ${room.name}`}
                      fallbackKind="room"
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                    {/* Dark gradient overlay over image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-transparent to-transparent" />
                    
                    {/* Badge */}
                    <span className={`absolute left-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${config.badgeClass}`}>
                      {config.label}
                    </span>
                  </div>

                  {/* Card Header */}
                  <CardHeader className="px-6 pt-5 pb-3">
                    <CardTitle className="font-heading text-2xl tracking-tight text-white font-bold">
                      {room.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-zinc-400 mt-1">
                      {room.capacity.min} - {room.capacity.max} khách · Không gian riêng tư
                    </CardDescription>
                  </CardHeader>

                  {/* Card Content */}
                  <CardContent className="px-6 py-2 space-y-5">
                    {/* Price Row */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                      <span className="text-sm text-zinc-400">Giá phòng</span>
                      <span className={`font-heading text-xl font-bold ${isActive ? "text-gold-soft" : "text-white"}`}>
                        {room.hourlyRate.toLocaleString("vi-VN")}đ
                        <span className="font-sans text-xs font-normal text-zinc-500">/giờ</span>
                      </span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 pt-1">
                      {room.features.slice(0, 4).map((feature, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-sm text-zinc-300"
                        >
                          <Check className="size-4 shrink-0 text-gold" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {/* Card Footer / Action */}
                  <CardFooter className="px-6 pt-4 pb-6">
                    {isActive ? (
                      <Button asChild className="luxury-button w-full h-11 text-xs uppercase tracking-wider font-semibold">
                        <Link href="/rooms">Xem phòng</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="luxury-button-outline w-full h-11 text-xs uppercase tracking-wider font-semibold border-gold/20 text-gold-soft">
                        <Link href="/rooms">Xem phòng</Link>
                      </Button>
                    )}
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
