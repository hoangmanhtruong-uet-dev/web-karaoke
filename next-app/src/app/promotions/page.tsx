"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gift,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { promotionFaqs, promotions } from "@/data/promotions"

const heroStats = [
  {
    icon: TicketPercent,
    label: "Ưu đãi chọn lọc",
    value: "4 gói",
  },
  {
    icon: CalendarClock,
    label: "Đặt lịch linh hoạt",
    value: "Hằng tuần",
  },
  {
    icon: ShieldCheck,
    label: "Điều kiện rõ ràng",
    value: "Minh bạch",
  },
]

const promotionIcons = [Clock3, Gift, Users, BadgePercent]

export default function PromotionsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c]">
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10131b] via-[#07080c] to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgb(214_180_106/0.2),transparent_34%),radial-gradient(circle_at_85%_15%,rgb(255_255_255/0.08),transparent_28%)]" />
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <Badge
              variant="outline"
              className="mb-6 border-gold/30 bg-[#10131b]/70 text-gold shadow-lg shadow-gold/10 backdrop-blur"
            >
              <Sparkles className="mr-2 size-3.5 fill-gold text-gold" />
              Đặc quyền Royal Karaoke
            </Badge>

            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
              Ưu đãi & combo hấp dẫn
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Những gói ưu đãi được thiết kế tinh tế cho từng dịp: tụ họp bạn
              bè, sinh nhật, đặt phòng sớm hoặc tận hưởng khung giờ vàng trong
              không gian karaoke sang trọng.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-foreground shadow-2xl shadow-black/20 backdrop-blur"
                >
                  <item.icon className="mx-auto mb-2 size-5 text-gold" />
                  <p className="font-heading text-lg font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative py-10 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_35%,rgb(214_180_106/0.08),transparent_28%)]" />
        <div className="container-custom relative z-10">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-gold/80">
                Promotions
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Chọn ưu đãi phù hợp cho buổi hẹn
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Mỗi chương trình đều có điều kiện và thời gian áp dụng rõ ràng để
              bạn dễ dàng lên kế hoạch trước khi đặt phòng.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {promotions.map((promotion, index) => {
              const Icon = promotionIcons[index] ?? TicketPercent

              return (
                <motion.article
                  key={promotion.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131b] p-6 shadow-[0_24px_70px_rgb(0_0_0/0.32)] transition duration-500 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_28px_90px_rgb(214_180_106/0.14)] sm:p-7"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgb(214_180_106/0.16),transparent_32%)] opacity-70 transition duration-500 group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold shadow-lg shadow-gold/10">
                        <Icon className="size-7" />
                      </div>
                      <Badge className="bg-gold text-[#08080b] shadow-lg shadow-gold/20">
                        {promotion.highlight}
                      </Badge>
                    </div>

                    <h3 className="font-heading text-2xl font-bold text-foreground">
                      {promotion.name}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {promotion.description}
                    </p>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <CheckCircle2 className="size-4 text-gold" />
                          Điều kiện áp dụng
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {promotion.condition}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <CalendarClock className="size-4 text-gold" />
                          Thời gian áp dụng
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {promotion.validTime}
                        </p>
                      </div>
                    </div>

                    <Button asChild className="luxury-button mt-6 h-12 w-full rounded-full">
                      <Link href="/booking">
                        Đặt phòng nhận ưu đãi
                        <ChevronRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="container-custom">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131b] p-6 shadow-[0_30px_100px_rgb(0_0_0/0.38)] sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgb(214_180_106/0.18),transparent_28%)]" />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge
                  variant="outline"
                  className="mb-5 border-gold/30 bg-gold/10 text-gold"
                >
                  <HelpCircle className="mr-2 size-3.5" />
                  FAQ ưu đãi
                </Badge>
                <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                  Câu hỏi thường gặp
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Một vài lưu ý nhỏ giúp bạn sử dụng ưu đãi thuận tiện hơn khi
                  đặt phòng tại Royal Karaoke.
                </p>
              </div>

              <div className="space-y-4">
                {promotionFaqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative pb-20 lg:pb-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[#10131b] p-8 text-center shadow-[0_30px_100px_rgb(0_0_0/0.4)] sm:p-12 lg:p-16"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(214_180_106/0.18),transparent_36%)]" />
            <div className="relative z-10 mx-auto max-w-3xl">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Sẵn sàng tận hưởng ưu đãi hôm nay?
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Đặt phòng trước để đội ngũ Royal Karaoke tư vấn gói ưu đãi phù hợp
                nhất với số lượng khách, thời gian và phong cách buổi tiệc.
              </p>
              <Button asChild className="luxury-button mt-8 h-14 rounded-full px-8">
                <Link href="/booking">
                  Đặt phòng nhận ưu đãi
                  <ChevronRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  )
}