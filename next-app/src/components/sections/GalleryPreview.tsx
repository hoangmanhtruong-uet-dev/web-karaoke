"use client"

import { motion } from "framer-motion"

const galleryItems = [
  "Phòng VIP ánh sáng vàng",
  "Sảnh chờ sang trọng",
  "Không gian tiệc riêng",
  "Hệ thống âm thanh",
  "Quầy bar mini",
  "Phòng luxury",
]

export default function GalleryPreview() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-[#0a0c12] to-[#07080c]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgb(214_180_106/0.08),transparent_28%)]" />

      <div className="container-custom relative z-10">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="luxury-eyebrow mb-4">Không gian</p>
          <h2 className="section-title">Gallery luxury preview</h2>
          <p className="section-description mx-auto max-w-2xl">
            Visual placeholder mô phỏng không gian karaoke cao cấp với ánh sáng, vật liệu
            và bố cục hiện đại.
          </p>
        </div>

        <div className="grid auto-rows-[240px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {galleryItems.map((item, idx) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className={`group relative overflow-hidden rounded-3xl border border-gold/12 bg-gradient-to-br from-[#111218] via-[#0f1015] to-[#0a0c12] transition-all duration-500 hover:border-gold/30 hover:shadow-[0_25px_60px_rgba(214,180,106,0.14)] ${
                idx === 0 || idx === 5 ? "lg:col-span-2" : ""
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080c]/95 via-[#07080c]/40 to-transparent transition-opacity duration-500" />
              <div className="absolute inset-x-6 bottom-6">
                <p className="font-heading text-xl font-semibold text-gold-soft">{item}</p>
                <div className="mt-3 h-px w-16 bg-gradient-to-r from-gold/40 to-transparent transition-all duration-500 group-hover:w-28" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}