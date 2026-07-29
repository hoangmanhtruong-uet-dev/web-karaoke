"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Clock, MapPin, Phone } from "lucide-react"

import SafeImage from "@/components/ui/SafeImage"
import { Button } from "@/components/ui/button"
import { branches } from "@/data/branches"

export default function BranchPreview() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-[#0a0c12] to-[#07080c]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgb(214_180_106/0.08),transparent_26%)]" />

      <div className="container-custom relative z-10">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="luxury-eyebrow mb-4">Hệ thống chi nhánh</p>
          <h2 className="section-title">
            Gần bạn hơn tại các vị trí trung tâm
          </h2>
          <p className="section-description mx-auto max-w-2xl">
            Mỗi chi nhánh được vận hành theo tiêu chuẩn dịch vụ thống nhất, đảm bảo trải
            nghiệm đáng tin cậy cho mọi buổi hẹn.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {branches.slice(0, 4).map((branch, idx) => (
            <motion.article
              key={branch.id}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className="luxury-card flex h-full flex-col overflow-hidden"
            >
               <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f1015] via-[#13141b] to-[#0a0c12]" />
<SafeImage src={branch.imageUrl} alt={`Ảnh chi nhánh ${branch.name}`} fallbackKind="branch" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover opacity-35 transition-transform duration-700 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/40 to-transparent" />
              </div>
               <div className="px-6 pb-6">
                <h3 className="font-heading text-xl font-bold text-foreground">
                  {branch.name.split(" - ").slice(1).join(" - ")}
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="size-4 shrink-0 text-gold" />
                    <span>{branch.address}, {branch.district}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="size-4 shrink-0 text-gold" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="size-4 shrink-0 text-gold" />
                    <span>{branch.openingHours.open} - {branch.openingHours.close}</span>
                  </div>
                </div>

                <Button asChild className="luxury-button mt-6 w-full">
                  <Link href="/booking">Xem chi tiết</Link>
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
