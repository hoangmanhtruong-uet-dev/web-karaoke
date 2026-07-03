"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Building2,
  Check,
  ChevronRight,
  Crown,
  Filter,
  Gem,
  Headphones,
  MapPin,
  Maximize2,
  Music2,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { branches } from "@/data/branches"
import { rooms } from "@/data/rooms"
import type { Room, RoomTier } from "@/types"

type TierFilter = "all" | "standard" | "vip" | "luxury"
type CapacityFilter = "all" | "small" | "medium" | "large"

const tierLabels: Record<RoomTier, string> = {
  standard: "Standard",
  vip: "VIP",
  premium: "Luxury",
  presidential: "Luxury",
}

const tierDescriptions: Record<RoomTier, string> = {
  standard: "Không gian tinh tế, đầy đủ tiện nghi cho buổi hát thân mật.",
  vip: "Trải nghiệm riêng tư với âm thanh, ánh sáng và dịch vụ nâng cấp.",
  premium: "Không gian cao cấp dành cho tiệc sang trọng và gặp gỡ đối tác.",
  presidential: "Đẳng cấp thượng hạng với tiện nghi độc quyền và phục vụ riêng.",
}

const tierStyles: Record<RoomTier, string> = {
  standard: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  vip: "border-gold/35 bg-gold/15 text-gold",
  premium: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
  presidential: "border-amber-300/40 bg-amber-300/15 text-amber-100",
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)

const getBranch = (branchId: string) =>
  branches.find((branch) => branch.id === branchId)

const getTierFilterValue = (tier: RoomTier): TierFilter => {
  if (tier === "premium" || tier === "presidential") return "luxury"
  return tier
}

const roomMatchesCapacity = (room: Room, capacity: CapacityFilter) => {
  if (capacity === "all") return true
  if (capacity === "small") return room.capacity.max <= 10
  if (capacity === "medium") return room.capacity.max > 10 && room.capacity.max <= 16
  return room.capacity.max > 16
}

export default function RoomsPage() {
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedTier, setSelectedTier] = useState<TierFilter>("all")
  const [selectedCapacity, setSelectedCapacity] = useState<CapacityFilter>("all")
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const branchMatch =
        selectedBranch === "all" || room.branchId === selectedBranch
      const tierMatch =
        selectedTier === "all" || getTierFilterValue(room.tier) === selectedTier
      const capacityMatch = roomMatchesCapacity(room, selectedCapacity)

      return branchMatch && tierMatch && capacityMatch
    })
  }, [selectedBranch, selectedTier, selectedCapacity])

  const activeBranchName =
    selectedBranch === "all"
      ? "Tất cả chi nhánh"
      : getBranch(selectedBranch)?.name ?? "Chi nhánh"

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c]">
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10131b] via-[#07080c] to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(214_180_106/0.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgb(120_90_255/0.16),transparent_30%)]" />
        <div className="absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

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
              <Crown className="mr-2 size-3.5 fill-gold text-gold" />
              Bộ sưu tập phòng hát cao cấp
            </Badge>

            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
              Hệ thống phòng hát hiện đại
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Khám phá không gian karaoke được thiết kế như private lounge:
              âm thanh chuẩn sân khấu, ánh sáng điện ảnh và dịch vụ riêng tư
              cho mọi buổi tiệc.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Music2, label: "Âm thanh hi-end" },
                { icon: Sparkles, label: "Không gian sang trọng" },
                { icon: Headphones, label: "Dịch vụ tận phòng" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-foreground shadow-2xl shadow-black/20 backdrop-blur"
                >
                  <item.icon className="mx-auto mb-2 size-5 text-gold" />
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-20 -mt-6 pb-10">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] border border-white/10 bg-[#10131b]/90 p-4 shadow-[0_30px_90px_rgb(0_0_0/0.35)] backdrop-blur-xl sm:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-gold/15 text-gold">
                <Filter className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Tìm phòng phù hợp
                </h2>
                <p className="text-sm text-muted-foreground">
                  Lọc theo chi nhánh, hạng phòng và số lượng khách.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Chi nhánh
                </span>
                <select
                  value={selectedBranch}
                  onChange={(event) => setSelectedBranch(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#07080c] px-4 text-sm text-foreground outline-none transition focus:border-gold/50 focus:ring-2 focus:ring-gold/15"
                >
                  <option value="all">Tất cả chi nhánh</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Loại phòng
                </span>
                <select
                  value={selectedTier}
                  onChange={(event) =>
                    setSelectedTier(event.target.value as TierFilter)
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#07080c] px-4 text-sm text-foreground outline-none transition focus:border-gold/50 focus:ring-2 focus:ring-gold/15"
                >
                  <option value="all">Tất cả loại phòng</option>
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                  <option value="luxury">Luxury</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Sức chứa
                </span>
                <select
                  value={selectedCapacity}
                  onChange={(event) =>
                    setSelectedCapacity(event.target.value as CapacityFilter)
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#07080c] px-4 text-sm text-foreground outline-none transition focus:border-gold/50 focus:ring-2 focus:ring-gold/15"
                >
                  <option value="all">Mọi sức chứa</option>
                  <option value="small">Nhóm nhỏ: đến 10 khách</option>
                  <option value="medium">Nhóm vừa: 11 - 16 khách</option>
                  <option value="large">Tiệc lớn: trên 16 khách</option>
                </select>
              </label>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative py-10 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_35%,rgb(214_180_106/0.08),transparent_28%)]" />
        <div className="container-custom relative z-10">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-gold/80">
                {activeBranchName}
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                {filteredRooms.length} phòng đang hiển thị
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Mỗi phòng được tuyển chọn theo tiêu chuẩn âm thanh, ánh sáng và
              trải nghiệm riêng tư của VivaStar.
            </p>
          </div>

          {filteredRooms.length > 0 ? (
            <motion.div
              layout
              className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
            >
              {filteredRooms.map((room, index) => {
                const branch = getBranch(room.branchId)

                return (
                  <motion.article
                    key={room.id}
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
                    <div className="relative h-72 overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${room.imageUrl})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#10131b] via-[#10131b]/25 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-transparent to-black/50" />

                      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={`backdrop-blur ${tierStyles[room.tier]}`}
                        >
                          <Gem className="mr-1.5 size-3.5" />
                          {tierLabels[room.tier]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            room.status === "available"
                              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 backdrop-blur"
                              : "border-orange-300/30 bg-orange-300/10 text-orange-100 backdrop-blur"
                          }
                        >
                          {room.status === "available"
                            ? "Sẵn sàng"
                            : "Đang bảo trì"}
                        </Badge>
                      </div>

                      <div className="absolute bottom-5 left-5 right-5">
                        <h3 className="font-heading text-2xl font-bold text-white">
                          {room.name}
                        </h3>
                        <div className="mt-3 flex items-center gap-2 text-sm text-white/80">
                          <MapPin className="size-4 text-gold" />
                          <span>{branch?.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <Users className="mb-2 size-5 text-gold" />
                          <p className="text-xs text-muted-foreground">
                            Sức chứa
                          </p>
                          <p className="font-semibold text-foreground">
                            {room.capacity.min} - {room.capacity.max} khách
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <WalletCards className="mb-2 size-5 text-gold" />
                          <p className="text-xs text-muted-foreground">
                            Giá / giờ
                          </p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(room.hourlyRate)}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm leading-6 text-muted-foreground">
                        {tierDescriptions[room.tier]}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {room.features.slice(0, 4).map((feature) => (
                          <span
                            key={feature}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          variant="outline"
                          className="luxury-button-outline h-12 rounded-full"
                          onClick={() => setSelectedRoom(room)}
                        >
                          <Maximize2 className="mr-2 size-4" />
                          Xem chi tiết
                        </Button>
                        <Button asChild className="luxury-button h-12 rounded-full">
<Link href="/booking">
                            Đặt phòng này
                            <ChevronRight className="ml-2 size-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </motion.div>
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-[#10131b] px-6 py-20 text-center">
              <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-white/[0.04]">
                <Filter className="size-8 text-gold" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground">
                Chưa tìm thấy phòng phù hợp
              </h3>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Hãy thử thay đổi chi nhánh, loại phòng hoặc sức chứa để xem
                thêm lựa chọn khác.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="container-custom">
          <div className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[#10131b] p-8 shadow-[0_30px_100px_rgb(0_0_0/0.4)] sm:p-12 lg:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgb(214_180_106/0.2),transparent_32%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10131b] via-[#10131b]/90 to-[#10131b]/40" />
            <div className="relative z-10 max-w-2xl">
              <Badge
                variant="outline"
                className="mb-5 border-gold/30 bg-gold/10 text-gold"
              >
                Tư vấn riêng
              </Badge>
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Cần chọn phòng cho tiệc sinh nhật, họp mặt hay sự kiện VIP?
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Đội ngũ VivaStar sẽ gợi ý phòng, combo món ăn và khung giờ phù
                hợp để buổi tiệc của bạn trọn vẹn hơn.
              </p>
              <Button asChild className="luxury-button mt-8 h-14 rounded-full px-8">
<Link href="/booking">Đặt lịch tư vấn</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedRoom)} onOpenChange={() => setSelectedRoom(null)}>
        {selectedRoom && (
          <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0a0c12] p-0 text-foreground shadow-[0_30px_120px_rgb(0_0_0/0.7)] sm:max-w-5xl">
            <DialogTitle className="sr-only">{selectedRoom.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Chi tiết phòng karaoke {selectedRoom.name}
            </DialogDescription>

            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative min-h-[320px] overflow-hidden lg:min-h-[620px]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedRoom.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-[#0a0c12]/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0c12]/35" />

                <div className="absolute bottom-6 left-6 right-6">
                  <Badge
                    variant="outline"
                    className={`mb-4 backdrop-blur ${tierStyles[selectedRoom.tier]}`}
                  >
                    <Crown className="mr-1.5 size-3.5" />
                    {tierLabels[selectedRoom.tier]}
                  </Badge>
                  <h3 className="font-heading text-3xl font-bold text-white sm:text-5xl">
                    {selectedRoom.name}
                  </h3>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                    <Building2 className="size-4 text-gold" />
                    {getBranch(selectedRoom.branchId)?.name}
                  </p>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-gold/80">
                      Chi tiết phòng
                    </p>
                    <h4 className="mt-2 font-heading text-2xl font-bold">
                      Trải nghiệm riêng tư chuẩn lounge
                    </h4>
                  </div>
                  <button
                    aria-label="Đóng"
                    onClick={() => setSelectedRoom(null)}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-gold/40 hover:text-gold"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <p className="text-sm leading-7 text-muted-foreground">
                  {tierDescriptions[selectedRoom.tier]} Phòng được bố trí để
                  tối ưu âm học, cách âm và sự thoải mái trong suốt buổi hát.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <Users className="mb-3 size-5 text-gold" />
                    <p className="text-xs text-muted-foreground">Sức chứa</p>
                    <p className="mt-1 font-semibold">
                      {selectedRoom.capacity.min} - {selectedRoom.capacity.max} khách
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <WalletCards className="mb-3 size-5 text-gold" />
                    <p className="text-xs text-muted-foreground">Giá</p>
                    <p className="mt-1 font-semibold text-gold">
                      {formatCurrency(selectedRoom.hourlyRate)} / giờ
                    </p>
                  </div>
                </div>

                <div>
                  <h5 className="mb-3 font-heading text-lg font-bold">
                    Features & tiện ích
                  </h5>
                  <div className="space-y-3">
                    {selectedRoom.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                          <Check className="size-3.5" />
                        </span>
                        <span className="text-sm leading-6 text-muted-foreground">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-gold/20 bg-gold/10 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Giá phòng từ
                      </p>
                      <p className="font-heading text-2xl font-bold text-gold">
                        {formatCurrency(selectedRoom.hourlyRate)}
                      </p>
                    </div>
                    <Badge className="bg-gold text-[#08080b]">
                      / giờ
                    </Badge>
                  </div>
                  <Button asChild className="luxury-button mt-5 h-12 w-full rounded-full">
<Link href="/booking">
                      Đặt phòng này
                      <ChevronRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}