"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Filter,
  Maximize2,
  X,
  Grid3X3,
  Sofa,
  Utensils,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

type GalleryCategory = "all" | "vip" | "luxury" | "waiting" | "menu"

interface GalleryItem {
  id: string
  title: string
  category: GalleryCategory
  description: string
  colorGradient: string
}

const galleryItems: GalleryItem[] = [
  // VIP Rooms
  {
    id: "vip-01",
    title: "Phòng VIP Diamond",
    category: "vip",
    description: "Không gian riêng tư với hệ thống âm thanh JBL Professional và LED 85 inch",
    colorGradient: "from-violet-900/40 via-purple-900/30 to-indigo-900/40",
  },
  {
    id: "vip-02",
    title: "Phòng VIP Ruby",
    category: "vip",
    description: "Sang trọng với bàn pha chế tại chỗ và hệ thống đèn LED RGB",
    colorGradient: "from-rose-900/40 via-pink-900/30 to-red-900/40",
  },
  {
    id: "vip-03",
    title: "Phòng VIP Sapphire",
    category: "vip",
    description: "Thiết kế hiện đại với view thành phố và âm thanh Yamaha",
    colorGradient: "from-cyan-900/40 via-blue-900/30 to-sky-900/40",
  },
  // Luxury Rooms
  {
    id: "luxury-01",
    title: "Phòng Luxury Sky Pearl",
    category: "luxury",
    description: "View toàn cảnh sông Sài Gòn với hệ thống âm thanh Bose và sân thượng riêng",
    colorGradient: "from-emerald-900/40 via-teal-900/30 to-green-900/40",
  },
  {
    id: "luxury-02",
    title: "Phòng Luxury Cloud Nine",
    category: "luxury",
    description: "Tầm nhìn 360° với Dolby Atmos 7.1.4 và trần sao lấp lánh",
    colorGradient: "from-amber-900/40 via-orange-900/30 to-yellow-900/40",
  },
  {
    id: "luxury-03",
    title: "Phòng Luxury Starlight",
    category: "luxury",
    description: "Trần sao tự nhiên với Harman Kardon và bàn billiard mini",
    colorGradient: "from-fuchsia-900/40 via-purple-900/30 to-pink-900/40",
  },
  // Waiting Lounge
  {
    id: "waiting-01",
    title: "Sảnh chờ VIP",
    category: "waiting",
    description: "Không gian thư giãn sang trọng với hồ bơi vô cực và bar cao cấp",
    colorGradient: "from-slate-800/40 via-gray-800/30 to-zinc-800/40",
  },
  {
    id: "waiting-02",
    title: "Sky Lounge",
    category: "waiting",
    description: "Khu vực thưởng thức đồ uống với view thành phố và ánh vàng sang trọng",
    colorGradient: "from-indigo-800/40 via-violet-800/30 to-purple-800/40",
  },
  // Menu
  {
    id: "menu-01",
    title: "Món Ăn Cao Cấp",
    category: "menu",
    description: "Thực đơn đa dạng từ gà Tanpopo đến tôm hùm Nha Trang",
    colorGradient: "from-orange-900/40 via-red-900/30 to-rose-900/40",
  },
  {
    id: "menu-02",
    title: "Đồ Uống Đặc Sản",
    category: "menu",
    description: "Rượu Vodka, Whiskey Jack Daniel's và Sake premium cao cấp",
    colorGradient: "from-amber-800/40 via-yellow-800/30 to-amber-700/40",
  },
  {
    id: "menu-03",
    title: "Combo Tiệc",
    category: "menu",
    description: "Các combo tiệc từ Standard đến Party cho mọi quy mô",
    colorGradient: "from-lime-900/40 via-green-900/30 to-emerald-900/40",
  },
  {
    id: "menu-04",
    title: "Bar Mini",
    category: "menu",
    description: "Khu vực bar tại chỗ phục vụ đồ uống và món ăn nhanh",
    colorGradient: "from-cyan-800/40 via-teal-800/30 to-blue-800/40",
  },
]

const categoryIcons: Record<GalleryCategory, React.ElementType> = {
  all: Grid3X3,
  vip: Star,
  luxury: Star,
  waiting: Sofa,
  menu: Utensils,
}

const categoryLabels: Record<GalleryCategory, string> = {
  all: "Tất cả",
  vip: "Phòng VIP",
  luxury: "Phòng Luxury",
  waiting: "Sảnh chờ",
  menu: "Menu",
}

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>("all")
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)

  const filteredItems = useMemo(() => {
    return selectedCategory === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === selectedCategory)
  }, [selectedCategory])

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10131b] via-[#07080c] to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(214_180_106/0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgb(138_99_228/0.12),transparent_30%)]" />
        <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/8 blur-3xl" />
        <div className="absolute left-1/3 top-40 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-1/3 top-32 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-600/8 blur-3xl" />

        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-[#10131b]/70 px-4 py-2 text-sm text-gold shadow-lg shadow-gold/10 backdrop-blur"
            >
              <Star className="size-3.5 fill-gold text-gold" />
              Không gian giải trí đẳng cấp
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="font-heading text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Khám phá không gian
              <br />
              <span className="text-gold">Royal Karaoke</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
            >
              Trải nghiệm không gian karaoke được thiết kế như private lounge:
              âm thanh chuẩn sân khấu, ánh sáng điện ảnh và dịch vụ riêng tư
              cho mọi buổi tiệc.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="relative -mt-6 pb-10">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="rounded-[2rem] border border-white/10 bg-[#10131b]/90 p-4 shadow-[0_30px_90px_rgb(0_0_0/0.35)] backdrop-blur-xl sm:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-gold/15 text-gold">
                <Filter className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Lọc theo không gian
                </h2>
                <p className="text-sm text-muted-foreground">
                  Chọn hạng mục để xem chi tiết không gian
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {(
                [
                  "all",
                  "vip",
                  "luxury",
                  "waiting",
                  "menu",
                ] as GalleryCategory[]
              ).map((category) => {
                const Icon = categoryIcons[category]
                const isActive = selectedCategory === category

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`
                      group relative flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-300
                      ${
                        isActive
                          ? "border-gold/50 bg-gold/10 text-gold shadow-lg shadow-gold/15"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-gold/30 hover:bg-white/[0.05] hover:text-gold-soft hover:shadow-lg"
                      }
                    `}
                  >
                    <Icon className="size-4" />
                    {categoryLabels[category]}
                    {isActive && (
                      <motion.span
                        layoutId="active-indicator"
                        className="absolute inset-0 rounded-xl border border-gold/30 bg-gold/20 -z-10"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="relative py-10 lg:py-16">
        <div className="container-custom relative z-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                {categoryLabels[selectedCategory]}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Hiển thị {filteredItems.length} không gian
                {filteredItems.length !== 1 ? "s" : ""} thuộc danh mục{" "}
                {categoryLabels[selectedCategory].toLowerCase()}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
              <Grid3X3 className="size-4 text-gold" />
              <span className="text-sm text-muted-foreground">
                Masonry layout
              </span>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131b] shadow-[0_24px_70px_rgb(0_0_0/0.32)] transition duration-500 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_28px_90px_rgb(214_180_106/0.14)]"
                >
                  <div className="relative h-64 overflow-hidden">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.colorGradient} transition duration-700 group-hover:scale-110`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10131b] via-[#10131b]/25 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-transparent to-black/50" />

                    <div className="absolute left-5 top-5 flex gap-2">
                      <span className="rounded-full border border-gold/30 bg-black/40 px-3 py-1 text-xs font-medium text-gold backdrop-blur">
                        {categoryLabels[item.category]}
                      </span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="font-heading text-2xl font-bold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-white/80">
                        {item.description}
                      </p>
                    </div>

                    <div className="absolute bottom-5 right-5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 rounded-full border-gold/30 bg-black/40 text-gold backdrop-blur hover:bg-gold/20 hover:text-white hover:border-gold/60"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <span className="text-sm font-medium text-gold-soft">
                        Xem chi tiết
                      </span>
                      <Maximize2 className="size-4 text-gold" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-[#10131b] px-6 py-20 text-center">
              <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-white/[0.04]">
                <Filter className="size-8 text-gold" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground">
                Chưa tìm thấy không gian
              </h3>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Hãy thử chọn danh mục khác để xem thêm không gian phù hợp.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 lg:py-24">
        <div className="container-custom">
          <div className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[#10131b] p-8 shadow-[0_30px_100px_rgb(0_0_0/0.4)] sm:p-12 lg:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgb(214_180_106/0.15),transparent_32%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10131b] via-[#10131b]/90 to-[#10131b]/40" />

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-5 py-2 text-sm text-gold shadow-lg shadow-gold/15">
                  <Star className="size-4 fill-gold" />
                  Trải nghiệm không gian này hôm nay
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  viewport={{ once: true }}
                  className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl"
                >
                  Sẵn sàng cho buổi hát đẳng cấp?
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
                >
                  Đặt phòng ngay để trải nghiệm không gian karaoke sang trọng,
                  âm thanh chuẩn sân khấu và dịch vụ tận tâm tại Royal Karaoke.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  viewport={{ once: true }}
                  className="mt-10 flex flex-wrap justify-center gap-4"
                >
                  <Button asChild className="luxury-button h-14 rounded-full px-8 text-base">
                    <Link href="/booking">Đặt phòng ngay</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="luxury-button-outline h-14 rounded-full px-8 text-base"
                  >
                    <Link href="/rooms">Khám phá phòng hát</Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Dialog for Selected Item */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={() => setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0a0c12] p-0 text-foreground shadow-[0_30px_120px_rgb(0_0_0/0.7)] sm:max-w-4xl">
            <DialogTitle className="sr-only">{selectedItem.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Chi tiết không gian {selectedItem.title}
            </DialogDescription>

            <div className="relative min-h-[300px] overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${selectedItem.colorGradient}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-[#0a0c12]/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0c12]/35" />

              <button
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 z-10 grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur hover:bg-white/20"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>

              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-block rounded-full border border-gold/30 bg-black/40 px-3 py-1 text-xs font-medium text-gold backdrop-blur">
                  {categoryLabels[selectedItem.category]}
                </span>
                <h3 className="font-heading mt-3 text-3xl font-bold text-white sm:text-4xl">
                  {selectedItem.title}
                </h3>
                <p className="mt-3 text-base text-white/80">{selectedItem.description}</p>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-gold/80">
                    Chi tiết không gian
                  </p>
                  <h4 className="mt-2 font-heading text-2xl font-bold">
                    Trải nghiệm cao cấp chuẩn lounge
                  </h4>
                </div>
                <button
                  aria-label="Đóng"
                  onClick={() => setSelectedItem(null)}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-gold/40 hover:text-gold"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-sm leading-7 text-muted-foreground">
                Không gian được thiết kế để tối ưu trải nghiệm karaoke với âm thanh
                chuẩn sân khấu, ánh sáng điện ảnh và dịch vụ riêng tư cho mọi buổi
                tiệc.
              </p>

              <div className="rounded-3xl border border-gold/20 bg-gold/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Trải nghiệm</p>
                    <p className="font-heading text-2xl font-bold text-gold">
                      {selectedItem.title}
                    </p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-full bg-gold/20">
                    <Star className="size-6 text-gold" />
                  </div>
                </div>
                <Button asChild className="luxury-button mt-5 h-12 w-full rounded-full">
                  <Link href="/booking">Đặt phòng ngay</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}
