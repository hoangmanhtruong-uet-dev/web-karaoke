"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  Car,
  ChevronRight,
  Clock,
  ConciergeBell,
  Crown,
  MapPin,
  Martini,
  Music2,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import SectionHeading from "@/components/sections/SectionHeading"
import { siteConfig } from "@/config/site"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import SafeImage from "@/components/ui/SafeImage"
import { branches } from "@/data/branches"
import { rooms } from "@/data/rooms"
import LocalBusinessJsonLd from "@/components/seo/LocalBusinessJsonLd"

const reasons = [
  {
    title: "Vị trí thuận tiện",
    description:
      "Hệ thống chi nhánh tọa lạc tại các khu vực trung tâm, dễ di chuyển và có bãi đỗ xe thuận tiện.",
    icon: MapPin,
  },
  {
    title: "Phòng hiện đại",
    description:
      "Không gian riêng tư với âm thanh hi-end, ánh sáng sân khấu và nội thất cao cấp cho mọi cuộc vui.",
    icon: Music2,
  },
  {
    title: "Dịch vụ chuyên nghiệp",
    description:
      "Đội ngũ phục vụ tận tâm, hỗ trợ set up tiệc, tư vấn phòng và chăm sóc khách hàng chu đáo.",
    icon: ConciergeBell,
  },
  {
    title: "Menu đa dạng",
    description:
      "Đồ uống, món ăn, trái cây và combo tiệc được tuyển chọn để đồng hành trọn vẹn cùng buổi hát.",
    icon: Martini,
  },
]

const stats = [
  {
    value: `${branches.length}+`,
    label: "Chi nhánh cao cấp",
  },
  {
    value: `${rooms.length}+`,
    label: "Phòng hát sẵn sàng",
  },
  {
    value: "09:00",
    label: "Mở cửa mỗi ngày",
  },
]

const getRoomCount = (branchId: string) =>
  rooms.filter((room) => room.branchId === branchId).length

const formatOpeningHours = (open: string, close: string) => `${open} - ${close}`

export default function BranchesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c]">
      {branches.filter((branch) => branch.status === "active").map((branch) => <LocalBusinessJsonLd key={branch.id} branch={branch} />)}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10131b] via-[#07080c] to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgb(214_180_106/0.24),transparent_34%),radial-gradient(circle_at_82%_18%,rgb(25_42_72/0.42),transparent_36%)]" />
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-custom relative z-10">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-gold/30 bg-[#10131b]/70 text-gold shadow-lg shadow-gold/10 backdrop-blur"
              >
                <Crown className="mr-2 size-3.5 fill-gold text-gold" />
                Hệ thống Royal Karaoke
              </Badge>

              <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl">
                Tìm chi nhánh{" "}
                <span className="gold-gradient-text">gần bạn</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Lựa chọn chi nhánh Royal Karaoke thuận tiện nhất để tận hưởng
                phòng hát sang trọng, âm thanh hiện đại và dịch vụ chuẩn lounge
                cho những buổi tiệc đáng nhớ.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Button asChild className="luxury-button h-12 px-8 text-base">
                  <Link href="#branches-list">
                    Xem danh sách chi nhánh
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="luxury-button-outline h-12 px-8 text-base"
                >
<Link href="/booking">Đặt phòng ngay</Link>
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-4 border-t border-gold/10 pt-8">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="font-heading text-2xl font-bold text-gold sm:text-3xl">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[3rem] bg-gold/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-gold/20 bg-[#10131b] p-5 shadow-[0_30px_100px_rgb(0_0_0/0.42)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgb(214_180_106/0.22),transparent_36%)]" />
                <div className="relative rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gold/80">
                        Royal map
                      </p>
                      <h2 className="mt-2 font-heading text-2xl font-bold text-foreground">
                        Chi nhánh nổi bật
                      </h2>
                    </div>
                    <div className="grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
                      <MapPin className="size-6" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {branches.slice(0, 3).map((branch, index) => (
                      <div
                        key={branch.id}
                        className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#07080c]/70 p-4"
                      >
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 font-heading font-bold text-gold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-heading text-lg font-bold text-foreground">
                            {branch.name}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {branch.district}, {branch.city}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/10 p-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="size-5 text-gold" />
                      <p className="text-sm leading-6 text-muted-foreground">
                        Tất cả chi nhánh đều đạt tiêu chuẩn dịch vụ, âm thanh và
                        không gian luxury của Royal Karaoke.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="branches-list" className="relative py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_35%,rgb(214_180_106/0.08),transparent_28%)]" />
        <div className="container-custom relative z-10">
          <SectionHeading
            eyebrow="Danh sách chi nhánh"
            title="Chọn điểm đến phù hợp cho cuộc vui của bạn"
            description="Mỗi chi nhánh Royal Karaoke được thiết kế như một private lounge riêng biệt, sẵn sàng phục vụ từ gặp gỡ thân mật đến tiệc VIP."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {branches.map((branch, index) => {
              const roomCount = getRoomCount(branch.id)

              return (
                <motion.article
                  key={branch.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  viewport={{ once: true, margin: "-80px" }}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131b] shadow-[0_24px_70px_rgb(0_0_0/0.32)] transition duration-500 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_28px_90px_rgb(214_180_106/0.14)]"
                >
                  <div className="relative h-72 overflow-hidden">
                    <SafeImage src={branch.imageUrl} alt={`Ảnh chi nhánh ${branch.name}`} fallbackKind="branch" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10131b] via-[#10131b]/35 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-transparent to-black/55" />

                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100 backdrop-blur"
                      >
                        Đang hoạt động
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-gold/35 bg-gold/15 text-gold backdrop-blur"
                      >
                        <Building2 className="mr-1.5 size-3.5" />
                        {roomCount} phòng
                      </Badge>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      <p className="mb-2 text-xs uppercase tracking-[0.28em] text-gold/90">
                        {branch.district}
                      </p>
                      <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">
                        {branch.name}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <MapPin className="mb-3 size-5 text-gold" />
                        <p className="text-xs text-muted-foreground">Địa chỉ</p>
                        <p className="mt-1 text-sm font-medium leading-6 text-foreground">
                          {branch.address}, {branch.district}, {branch.city}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <Phone className="mb-3 size-5 text-gold" />
                        <p className="text-xs text-muted-foreground">Hotline</p>
                        <Link
                          href={`tel:${branch.phone.replace(/\s/g, "")}`}
                          className="mt-1 inline-flex text-sm font-semibold text-foreground transition hover:text-gold"
                        >
                          {branch.phone}
                        </Link>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <Clock className="mb-3 size-5 text-gold" />
                        <p className="text-xs text-muted-foreground">
                          Giờ mở cửa
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatOpeningHours(
                            branch.openingHours.open,
                            branch.openingHours.close,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <Users className="mb-3 size-5 text-gold" />
                        <p className="text-xs text-muted-foreground">Số phòng</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {roomCount} phòng karaoke
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {branch.amenities.slice(0, 4).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        asChild
                        variant="outline"
                        className="luxury-button-outline h-12 rounded-full"
                      >
                        <Link href="/rooms">
                          Xem phòng
                          <ArrowRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                      <Button asChild className="luxury-button h-12 rounded-full">
<Link href="/booking">
                          Đặt tại chi nhánh này
                          <ChevronRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_20%,rgb(214_180_106/0.1),transparent_28%)]" />
        <div className="container-custom relative z-10">
          <SectionHeading
            eyebrow="Royal Karaoke"
            title="Vì sao chọn Royal Karaoke?"
            description="Từ vị trí, không gian đến dịch vụ và thực đơn, Royal Karaoke mang đến trải nghiệm giải trí sang trọng, riêng tư và trọn vẹn."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason, index) => {
              const IconComponent = reason.icon

              return (
                <motion.div
                  key={reason.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.48,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  viewport={{ once: true, margin: "-80px" }}
                  className="luxury-card"
                >
                  <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-gold/15 text-gold">
                    <IconComponent className="size-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {reason.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-80px" }}
            className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[#10131b] p-8 shadow-[0_30px_100px_rgb(0_0_0/0.4)] sm:p-12 lg:p-16"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgb(214_180_106/0.22),transparent_34%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10131b] via-[#10131b]/92 to-[#10131b]/45" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-2xl">
                <Badge
                  variant="outline"
                  className="mb-5 border-gold/30 bg-gold/10 text-gold"
                >
                  <Sparkles className="mr-2 size-3.5" />
                  Contact nhanh
                </Badge>
                <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                  Cần tư vấn chi nhánh phù hợp?
                </h2>
                <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                  Gọi hotline hoặc đặt lịch nhanh để đội ngũ Royal Karaoke hỗ
                  trợ chọn chi nhánh, phòng hát và combo phù hợp với nhu cầu của
                  bạn.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                <Button asChild className="luxury-button h-14 px-8 text-base">
                  <Link href={siteConfig.hotlineHref}>
                    <Phone className="mr-2 size-5" />
                    {siteConfig.hotline}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="luxury-button-outline h-14 px-8 text-base"
                >
<Link href="/booking">
                    Đặt phòng ngay
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative z-10 mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <Phone className="size-5 text-gold" />
                <span className="text-sm text-muted-foreground">
                  Hotline 24/7
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <Car className="size-5 text-gold" />
                <span className="text-sm text-muted-foreground">
                  Bãi đỗ xe tiện lợi
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <Crown className="size-5 text-gold" />
                <span className="text-sm text-muted-foreground">
                  Dịch vụ chuẩn VIP
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  )
}