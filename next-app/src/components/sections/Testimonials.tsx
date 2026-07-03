"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

const testimonials = [
  {
    id: 1,
    text: "Không gian sang trọng, âm thanh đỉnh cao, đặc biệt phòng VIP rất thoải mái để tiếp khách hàng. Nhân viên phục vụ rất chuyên nghiệp.",
    author: "Anh Minh Quân",
    role: "Khách hàng thường xuyên",
    rating: 5,
    initial: "M",
  },
  {
    id: 2,
    text: "Tổ chức sinh nhật cho vợ ở đây, mọi người đều khen. Đồ ăn ngon, đồ uống đa dạng, bài hát cập nhật nhanh. Sẽ quay lại.",
    author: "Chị Thu Hương",
    role: "Khách hàng",
    rating: 5,
    initial: "T",
  },
  {
    id: 3,
    text: "Đặt phòng online nhanh, thanh toán tiện lợi. Giá cả hợp lý so với chất lượng. Có chỗ để xe rộng thoải mái.",
    author: "Anh Hoàng Nam",
    role: "Khách hàng thân thiết",
    rating: 5,
    initial: "H",
  },
]

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c12] via-[#07080c] to-[#0a0c12]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgb(214_180_106/0.1),transparent_30%)]" />

      <div className="container-custom relative z-10">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="luxury-eyebrow mb-4">Khách hàng nói gì</p>
          <h2 className="section-title">Trải nghiệm thực tế</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {testimonials.map((item, idx) => (
            <motion.figure
              key={item.id}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className="luxury-card flex flex-col"
            >
              <div className="mb-5 flex gap-1">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-gold text-gold" />
                ))}
              </div>

              <blockquote className="flex-1 text-base leading-8 text-muted-foreground">
                &ldquo;{item.text}&rdquo;
              </blockquote>

              <div className="mt-6 flex items-center gap-3 border-t border-gold/10 pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/10 text-sm font-bold text-gold">
                  {item.initial}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.author}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}