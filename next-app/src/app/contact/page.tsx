"use client"

import { FormEvent, ReactNode, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock,
  Headphones,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Users,
} from "lucide-react"

import SectionHeading from "@/components/sections/SectionHeading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { branches } from "@/data/branches"
import type { ApiResponse } from "@/lib/api-response"
import { formatPhone, isValidVietnamPhone } from "@/lib/utils"

type ContactForm = {
  fullName: string
  phone: string
  message: string
}

type ContactErrors = Partial<Record<keyof ContactForm, string>>

type ContactApiResponse = ApiResponse<{
  contactRequestId: string
  createdAt: string
  message: string
}>

const HOTLINE = "1900 1234 56"

const initialForm: ContactForm = {
  fullName: "",
  phone: "",
  message: "",
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-[#07080c]/80 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/20"

const textareaClassName =
  "min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#07080c]/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/20"

const fieldLabelClassName = "text-sm font-medium text-foreground"
const errorClassName = "mt-1.5 text-xs leading-5 text-rose-200"

const contactBlocks = [
  {
    title: "Zalo",
    description: "Chat nhanh với tư vấn viên để kiểm tra phòng trống và combo.",
    action: "Mở Zalo",
    href: "https://zalo.me/1900123456",
    icon: MessageCircle,
  },
  {
    title: "Messenger",
    description: "Gửi tin nhắn Facebook để nhận phản hồi và hình ảnh phòng.",
    action: "Nhắn Messenger",
    href: "https://m.me/royalkaraoke",
    icon: MessageSquare,
  },
  {
    title: "Google Maps",
    description: "Xem đường đi đến chi nhánh Royal Karaoke thuận tiện nhất.",
    action: "Xem bản đồ",
    href: "https://www.google.com/maps/search/Royal+Karaoke",
    icon: Map,
  },
]

const faqs = [
  {
    question: "Có cần đặt cọc không?",
    answer:
      "Thông thường Royal Karaoke không yêu cầu đặt cọc với yêu cầu giữ phòng cơ bản. Với phòng VIP, tiệc lớn hoặc trang trí đặc biệt, nhân viên sẽ thông báo trước nếu cần xác nhận thêm.",
  },
  {
    question: "Có được mang đồ ăn ngoài không?",
    answer:
      "Bạn có thể trao đổi trước với chi nhánh khi đặt phòng. Một số món đặc biệt như bánh sinh nhật có thể được hỗ trợ, còn đồ ăn ngoài sẽ phụ thuộc quy định từng thời điểm.",
  },
  {
    question: "Có phòng cho nhóm đông không?",
    answer:
      "Có. Hệ thống có nhiều hạng phòng phù hợp nhóm nhỏ đến nhóm đông, kèm âm thanh sân khấu và khu vực ngồi rộng để tổ chức tiệc.",
  },
  {
    question: "Có tổ chức sinh nhật không?",
    answer:
      "Có. Royal Karaoke hỗ trợ setup sinh nhật, gợi ý combo đồ ăn - thức uống, ánh sáng và playlist theo yêu cầu để buổi tiệc trọn vẹn hơn.",
  },
]

function validateContactForm(form: ContactForm) {
  const errors: ContactErrors = {}

  if (!form.fullName.trim()) {
    errors.fullName = "Bạn vui lòng nhập họ tên để Royal Karaoke tiện xưng hô."
  }

  if (!form.phone.trim()) {
    errors.phone = "Bạn vui lòng nhập số điện thoại để chúng tôi liên hệ lại."
  } else if (!isValidVietnamPhone(form.phone)) {
    errors.phone = "Số điện thoại chưa đúng định dạng. Ví dụ: 0901 234 567."
  }

  if (!form.message.trim()) {
    errors.message = "Bạn vui lòng nhập nội dung cần tư vấn."
  }

  return errors
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const submissionLockRef = useRef(false)

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status === "active"),
    []
  )

  const updateForm = <Key extends keyof ContactForm>(
    key: Key,
    value: ContactForm[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submissionLockRef.current) return

    const nextErrors = validateContactForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    submissionLockRef.current = true
    setIsSubmitting(true)
    setSubmitError("")

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.fullName.trim(),
          phone: form.phone,
          message: form.message.trim(),
        }),
      })
      const result = (await response.json()) as ContactApiResponse

      if (!response.ok || !result.success) {
        const apiError = result.success ? undefined : result.error
        setSubmitError(apiError?.message ?? "Không thể gửi liên hệ lúc này.")

        if (apiError?.fieldErrors) {
          setErrors({
            fullName: apiError.fieldErrors.name?.[0],
            phone: apiError.fieldErrors.phone?.[0],
            message: apiError.fieldErrors.message?.[0],
          })
        }
        return
      }

      setIsSuccessOpen(true)
      setForm(initialForm)
    } catch {
      setSubmitError("Kết nối chưa ổn định. Dữ liệu của bạn vẫn được giữ để thử lại.")
    } finally {
      submissionLockRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c]">
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10131b] via-[#07080c] to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgb(214_180_106/0.26),transparent_34%),radial-gradient(circle_at_84%_12%,rgb(59_130_246/0.16),transparent_32%)]" />
        <div className="absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

        <div className="container-custom relative z-10">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-gold/30 bg-[#10131b]/70 text-gold shadow-lg shadow-gold/10 backdrop-blur"
              >
                <Sparkles className="mr-2 size-3.5 fill-gold text-gold" />
                Royal Concierge
              </Badge>

              <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl">
                Liên hệ{" "}
                <span className="gold-gradient-text">Royal Karaoke</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Đội ngũ Royal Karaoke luôn sẵn sàng tư vấn chi nhánh, hạng
                phòng, combo tiệc và hỗ trợ đặt lịch cho mọi cuộc vui.
              </p>

              <div className="mt-10 rounded-[2rem] border border-gold/25 bg-gold/10 p-5 shadow-[0_22px_80px_rgb(214_180_106/0.12)] sm:p-6">
                <p className="mb-3 text-sm uppercase tracking-[0.28em] text-gold/80">
                  Hotline 24/7
                </p>
                <Link
                  href={`tel:${HOTLINE.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-4 font-heading text-4xl font-bold text-gold transition hover:text-gold/85 sm:text-5xl"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-gold text-[#08080b]">
                    <Phone className="size-7" />
                  </span>
                  {HOTLINE}
                </Link>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Gọi ngay để được kiểm tra phòng trống, giữ lịch nhanh và nhận
                  tư vấn combo phù hợp số lượng khách.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild className="luxury-button h-12 px-8 text-base">
                  <Link href="#contact-form">
                    Gửi yêu cầu tư vấn
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
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_10%,rgb(214_180_106/0.22),transparent_36%)]" />
                <div className="relative rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gold/80">
                        Kết nối nhanh
                      </p>
                      <h2 className="mt-2 font-heading text-2xl font-bold text-foreground">
                        Chọn kênh liên hệ
                      </h2>
                    </div>
                    <div className="grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
                      <Headphones className="size-6" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {contactBlocks.map((block) => {
                      const IconComponent = block.icon

                      return (
                        <Link
                          key={block.title}
                          href={block.href}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-[#07080c]/70 p-4 transition hover:border-gold/35 hover:bg-gold/10"
                        >
                          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                            <IconComponent className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {block.title}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {block.description}
                            </p>
                            <span className="mt-3 inline-flex items-center text-sm font-semibold text-gold">
                              {block.action}
                              <ChevronRight className="ml-1 size-4 transition group-hover:translate-x-1" />
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contact-form" className="relative py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_35%,rgb(214_180_106/0.08),transparent_28%)]" />
        <div className="container-custom relative z-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <motion.aside
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className="rounded-[2rem] border border-gold/20 bg-[#10131b]/90 p-6 shadow-[0_30px_90px_rgb(0_0_0/0.35)] backdrop-blur-xl sm:p-8 lg:sticky lg:top-24 lg:self-start"
            >
              <Badge
                variant="outline"
                className="mb-5 border-gold/30 bg-gold/10 text-gold"
              >
                <Phone className="mr-2 size-3.5" />
                Contact Center
              </Badge>
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Gửi thông tin, Royal Karaoke sẽ gọi lại
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Cho chúng tôi biết nhu cầu của bạn: đặt phòng, hỏi giá, tổ chức
                sinh nhật, tìm chi nhánh gần nhất hoặc tư vấn phòng cho nhóm
                đông.
              </p>

              <div className="mt-7 space-y-3">
                <InfoRow
                  icon={<Phone className="size-4" />}
                  title="Hotline"
                  value={HOTLINE}
                />
                <InfoRow
                  icon={<Clock className="size-4" />}
                  title="Thời gian hỗ trợ"
                  value="09:00 - 06:00 mỗi ngày"
                />
                <InfoRow
                  icon={<Users className="size-4" />}
                  title="Phục vụ"
                  value="Đặt phòng, tiệc sinh nhật, nhóm đông"
                />
              </div>
            </motion.aside>

            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className="rounded-[2rem] border border-white/10 bg-[#10131b]/90 p-4 shadow-[0_30px_90px_rgb(0_0_0/0.35)] backdrop-blur-xl sm:p-7 lg:p-8"
              noValidate
            >
              <div className="mb-7">
                <p className="text-sm uppercase tracking-[0.3em] text-gold/80">
                  Contact form
                </p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  Thông tin liên hệ
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Các trường bên dưới giúp Royal Karaoke phản hồi đúng nhu cầu
                  và nhanh nhất.
                </p>
              </div>

              <div className="space-y-5">
                <label className="block space-y-2">
                  <span className={fieldLabelClassName}>Họ tên *</span>
                  <input
                    value={form.fullName}
                    onChange={(event) => updateForm("fullName", event.target.value)}
                    placeholder="Ví dụ: Nguyễn Minh Anh"
                    className={inputClassName}
                    aria-invalid={Boolean(errors.fullName)}
                  />
                  {errors.fullName && (
                    <p className={errorClassName}>{errors.fullName}</p>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className={fieldLabelClassName}>Số điện thoại *</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", formatPhone(event.target.value))
                    }
                    inputMode="tel"
                    placeholder="0901 234 567"
                    className={inputClassName}
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <p className={errorClassName}>{errors.phone}</p>}
                </label>

                <label className="block space-y-2">
                  <span className={fieldLabelClassName}>Nội dung *</span>
                  <textarea
                      value={form.message}
                      onChange={(event) => updateForm("message", event.target.value)}
                      maxLength={2000}
                    placeholder="Ví dụ: Tôi cần đặt phòng cho 12 khách vào tối thứ 7, có trang trí sinh nhật..."
                    className={textareaClassName}
                    aria-invalid={Boolean(errors.message)}
                  />
                  {errors.message && (
                    <p className={errorClassName}>{errors.message}</p>
                  )}
                </label>
              </div>

              <div className="mt-8 rounded-3xl border border-gold/20 bg-gold/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      Sẵn sàng gửi liên hệ?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Royal Karaoke sẽ phản hồi qua số điện thoại bạn cung cấp.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="luxury-button h-13 rounded-full px-7 text-base sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Đang gửi..." : "Gửi liên hệ"}
                    <Send className="ml-2 size-5" />
                  </Button>
                </div>
              </div>
              {submitError && (
                <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                  {submitError}
                </p>
              )}
            </motion.form>
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_20%,rgb(214_180_106/0.1),transparent_28%)]" />
        <div className="container-custom relative z-10">
          <SectionHeading
            eyebrow="Chi nhánh Royal Karaoke"
            title="Danh sách chi nhánh hỗ trợ liên hệ trực tiếp"
            description="Bạn có thể gọi hotline chung hoặc liên hệ chi nhánh gần nhất để được tư vấn phòng, lịch trống và đường đi."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {activeBranches.map((branch, index) => (
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
                className="group rounded-[2rem] border border-white/10 bg-[#10131b] p-5 shadow-[0_24px_70px_rgb(0_0_0/0.32)] transition duration-500 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_28px_90px_rgb(214_180_106/0.14)] sm:p-6"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-gold/80">
                      {branch.district}
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">
                      {branch.name}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                  >
                    Đang hoạt động
                  </Badge>
                </div>

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
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="luxury-button-outline h-11 rounded-full px-5"
                  >
                    <Link href={`tel:${branch.phone.replace(/\s/g, "")}`}>
                      Gọi chi nhánh
                    </Link>
                  </Button>
                  <Button asChild className="luxury-button h-11 rounded-full px-5">
                    <Link
                      href={`https://www.google.com/maps/search/${encodeURIComponent(
                        `${branch.address}, ${branch.district}, ${branch.city}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem Maps
                      <ChevronRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="container-custom">
          <SectionHeading
            eyebrow="FAQ"
            title="Câu hỏi thường gặp khi liên hệ Royal Karaoke"
            description="Những thông tin nhanh giúp bạn chuẩn bị tốt hơn trước khi đặt phòng hoặc tổ chức tiệc."
          />

          <div className="mx-auto mt-12 grid max-w-5xl gap-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.48,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                viewport={{ once: true, margin: "-80px" }}
                className="rounded-[1.75rem] border border-white/10 bg-[#10131b]/90 p-5 shadow-[0_20px_70px_rgb(0_0_0/0.28)] sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <CircleHelp className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="border-gold/20 bg-[#10131b] p-6 text-foreground shadow-[0_30px_120px_rgb(0_0_0/0.7)] sm:max-w-md">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-200">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogTitle className="text-center font-heading text-2xl font-bold">
            Gửi liên hệ thành công
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-7">
            Royal Karaoke đã nhận thông tin của bạn. Nhân viên tư vấn sẽ liên hệ
            lại qua số điện thoại đã cung cấp trong thời gian sớm nhất.
          </DialogDescription>
          <Button
            onClick={() => setIsSuccessOpen(false)}
            className="luxury-button mt-2 h-12 rounded-full"
          >
            Đã hiểu
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: ReactNode
  title: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}
