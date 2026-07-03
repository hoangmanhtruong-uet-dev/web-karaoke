"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Phone, MessageCircle, Send, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const contacts = [
  {
    label: "Hotline",
    value: "1900 1234 56",
    href: "tel:1900123456",
    icon: Phone,
    variant: "luxury-button" as const,
  },
  {
    label: "Zalo",
    value: "Chat với tư vấn viên",
    href: "#",
    icon: MessageCircle,
    variant: "outline" as const,
  },
  {
    label: "Messenger",
    value: "Gửi tin nhắn",
    href: "#",
    icon: Send,
    variant: "outline" as const,
  },
]

export default function ContactCTA() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-[#0a0c12] to-[#07080c]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgb(214_180_106/0.14),transparent_32%)]" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="luxury-eyebrow mb-4">Liên hệ</p>
          <h2 className="section-title">Bạn cần hỗ trợ?</h2>
          <p className="section-description mx-auto max-w-2xl mb-10">
            Đội ngũ tư vấn luôn sẵn sàng qua hotline, Zalo hoặc Messenger
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4">
            {contacts.map((c) => {
              const IconComponent = c.icon
              return (
                <Button
                  key={c.label}
                  asChild
                  variant={c.variant === "outline" ? "outline" : "default"}
                  className={
                    c.variant === "luxury-button"
                      ? "luxury-button h-13 px-9 text-base"
                      : "luxury-button-outline h-13 px-9 text-base"
                  }
                >
                  <Link href={c.href}>
                    <IconComponent className="mr-2 size-5" />
                    {c.value}
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}