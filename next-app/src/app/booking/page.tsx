"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  MessageSquareText,
  Minus,
  PartyPopper,
  Phone,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { bookingTrustItems, brand } from "@/data/site"
import { cn, formatCurrency, formatPhone, isValidVietnamPhone } from "@/lib/utils"
import type { Branch, MenuItem, Room, RoomTier } from "@/types"

type BookingForm = {
  customerName: string
  customerPhone: string
  branchId: string
  roomTier: "" | RoomTier
  date: string
  startTime: string
  guestCount: number
  selectedMenuIds: string[]
  note: string
}

type BookingErrors = Partial<Record<keyof BookingForm, string>>

type BookingApiResponse = {
  success: boolean
  message: string
  bookingId?: string
  errors?: Record<string, string>
}

type BookingField = keyof Pick<
  BookingForm,
  "customerName" | "customerPhone" | "branchId" | "date" | "startTime" | "guestCount"
>

const MIN_GUESTS = 1
const MAX_GUESTS = 40
const TOP_BRANCH_LIMIT = 4
const SUGGESTED_ROOM_LIMIT = 3
const SUGGESTED_MENU_LIMIT = 4

const initialForm: BookingForm = {
  customerName: "",
  customerPhone: "",
  branchId: "",
  roomTier: "",
  date: "",
  startTime: "",
  guestCount: 2,
  selectedMenuIds: [],
  note: "",
}

const steps = [
  {
    title: "Liên hệ",
    description: "Tên và số điện thoại",
    fields: ["customerName", "customerPhone"] satisfies BookingField[],
  },
  {
    title: "Không gian",
    description: "Chi nhánh và hạng phòng",
    fields: ["branchId"] satisfies BookingField[],
  },
  {
    title: "Lịch hẹn",
    description: "Ngày, giờ và số khách",
    fields: ["date", "startTime", "guestCount"] satisfies BookingField[],
  },
]

const tierLabels: Record<RoomTier, string> = {
  standard: "Standard",
  vip: "VIP",
  premium: "Premium",
  presidential: "Presidential",
}

const tierDescriptions: Record<RoomTier, string> = {
  standard: "Gọn gàng, riêng tư",
  vip: "Đãi khách thân mật",
  premium: "Trải nghiệm cao cấp",
  presidential: "Không gian signature",
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-[#07080c]/80 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/20"

const fieldLabelClassName = "text-sm font-medium text-foreground"

const errorClassName = "mt-1.5 text-xs leading-5 text-rose-200"

function getTodayInputValue() {
  const today = new Date()
  const timezoneOffset = today.getTimezoneOffset() * 60_000

  return new Date(today.getTime() - timezoneOffset).toISOString().split("T")[0]
}

function getActiveStep(form: BookingForm) {
  if (!form.customerName.trim() || !form.customerPhone.trim()) return 0
  if (!form.branchId) return 1
  return 2
}

function getStepCompletion(form: BookingForm, fields: BookingField[]) {
  return fields.every((field) => {
    const value = form[field]

    if (typeof value === "string") return Boolean(value.trim())
    if (typeof value === "number") return Number.isFinite(value) && value >= MIN_GUESTS

    return Boolean(value)
  })
}

function validateBookingForm(form: BookingForm) {
  const errors: BookingErrors = {}

  if (!form.customerName.trim()) {
    errors.customerName = `Cho ${brand.name} biết tên để nhân viên xưng hô chính xác nhé.`
  }

  if (!form.customerPhone.trim()) {
    errors.customerPhone = "Bạn thêm số điện thoại để chúng tôi gọi xác nhận booking."
  } else if (!isValidVietnamPhone(form.customerPhone)) {
    errors.customerPhone = "Số điện thoại chưa đúng định dạng. Ví dụ: 0901 234 567."
  }

  if (!form.branchId) {
    errors.branchId = `Bạn chọn chi nhánh thuận tiện nhất để ${brand.name} giữ phòng.`
  }

  if (!form.date) {
    errors.date = "Bạn chọn ngày đến để chúng tôi kiểm tra tình trạng phòng."
  }

  if (!form.startTime) {
    errors.startTime = "Bạn chọn giờ bắt đầu dự kiến nhé."
  }

  if (
    !Number.isFinite(form.guestCount) ||
    form.guestCount < MIN_GUESTS ||
    form.guestCount > MAX_GUESTS
  ) {
    errors.guestCount = `Số khách nên trong khoảng ${MIN_GUESTS}-${MAX_GUESTS} để tư vấn phòng phù hợp.`
  }

  return errors
}

export default function BookingPage() {
  const [form, setForm] = useState<BookingForm>(initialForm)
  const [errors, setErrors] = useState<BookingErrors>({})
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [submitError, setSubmitError] = useState("")
  const minBookingDate = getTodayInputValue()

  // Data from API
  const [branches, setBranches] = useState<Branch[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Fetch branches, rooms, and menu items on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoadingData(true)
        const [branchesRes, roomsRes, menuItemsRes] = await Promise.all([
          fetch("/api/branches"),
          fetch("/api/rooms"),
          fetch("/api/menu-items"),
        ])

        if (branchesRes.ok) {
          const branchesData = await branchesRes.json()
          setBranches(branchesData.branches ?? [])
        }
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          setRooms(roomsData.rooms ?? [])
        }
        if (menuItemsRes.ok) {
          const menuItemsData = await menuItemsRes.json()
          setMenuItems(menuItemsData.menuItems ?? [])
        }
      } catch (error) {
        console.error("Failed to load booking data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [])

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status === "active"),
    [branches]
  )

  const availableRoomTiers = useMemo(
    () =>
      Array.from(
        new Set(rooms.filter((room) => room.status === "available").map((room) => room.tier))
      ) as RoomTier[],
    [rooms]
  )

  const suggestedMenuItems = useMemo(
    () =>
      menuItems
        .filter((item) => item.isAvailable && (item.category === "combo" || item.isSignature))
        .slice(0, SUGGESTED_MENU_LIMIT),
    [menuItems]
  )

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === form.branchId),
    [branches, form.branchId]
  )

  const suggestedRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        const branchMatch = !form.branchId || room.branchId === form.branchId
        const tierMatch = !form.roomTier || room.tier === form.roomTier

        return branchMatch && tierMatch && room.status === "available"
      })
      .slice(0, SUGGESTED_ROOM_LIMIT)
  }, [rooms, form.branchId, form.roomTier])

  const selectedMenuItems = useMemo(
    () => menuItems.filter((item) => form.selectedMenuIds.includes(item.id)),
    [menuItems, form.selectedMenuIds]
  )

  const menuTotal = selectedMenuItems.reduce((total, item) => total + item.price, 0)
  const activeStep = getActiveStep(form)
  const completedStepCount = steps.filter((step) =>
    getStepCompletion(form, step.fields)
  ).length

  const updateForm = <Key extends keyof BookingForm>(
    key: Key,
    value: BookingForm[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError("")
  }

  const toggleMenuItem = (itemId: string) => {
    setForm((current) => {
      const selectedMenuIds = current.selectedMenuIds.includes(itemId)
        ? current.selectedMenuIds.filter((id) => id !== itemId)
        : [...current.selectedMenuIds, itemId]

      return { ...current, selectedMenuIds }
    })
  }

  const handleGuestCountChange = (value: number) => {
    const safeValue = Number.isFinite(value)
      ? Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, value))
      : MIN_GUESTS

    updateForm("guestCount", safeValue)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) return

    setSubmitError("")
    setSubmitMessage("")

    const nextErrors = validateBookingForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.customerName.trim(),
          phone: formatPhone(form.customerPhone),
          branchId: form.branchId,
          roomType: form.roomTier,
          date: form.date,
          time: form.startTime,
          guests: form.guestCount,
          selectedMenuItems: form.selectedMenuIds,
          note: form.note.trim(),
        }),
      })

      const result = (await response.json()) as BookingApiResponse

      if (!response.ok || !result.success) {
        setSubmitError(result.message || "Không thể gửi yêu cầu đặt phòng.")

        const serverErrors = result.errors

        if (serverErrors) {
          setErrors((current) => ({
            ...current,
            customerName: serverErrors.name,
            customerPhone: serverErrors.phone,
            branchId: serverErrors.branchId,
            roomTier: serverErrors.roomType,
            date: serverErrors.date,
            startTime: serverErrors.time,
            guestCount: serverErrors.guests,
            note: serverErrors.note,
          }))
        }

        return
      }

      setSubmitMessage(result.message)
      setIsSuccessOpen(true)
      setForm(initialForm)
    } catch {
      setSubmitError("Kết nối chưa ổn định. Vui lòng thử lại sau ít phút.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07080c]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-gold" />
          <p className="text-base text-muted-foreground">Đang tải thông tin đặt phòng...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c] pb-24 lg:pb-0">
      <section className="relative pt-28 pb-8 sm:pt-32 lg:pt-40 lg:pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10131b] via-[#07080c] to-[#07080c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgb(214_180_106/0.26),transparent_34%),radial-gradient(circle_at_82%_12%,rgb(120_90_255/0.16),transparent_30%)]" />
        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <Badge
              variant="outline"
              className="mb-5 border-gold/30 bg-[#10131b]/75 text-gold shadow-lg shadow-gold/10 backdrop-blur"
            >
              <Sparkles className="mr-2 size-3.5 fill-gold text-gold" />
              Concierge xác nhận trong vài phút
            </Badge>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
              Đặt phòng {brand.name}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Một form ngắn gọn để giữ phòng trước. Bạn chỉ cần để lại thông tin
              quan trọng, phần còn lại đội ngũ {brand.name} sẽ tư vấn trực tiếp.
            </p>

            <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
              {bookingTrustItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
                >
                  <div className="mb-3 grid size-8 place-items-center rounded-full bg-gold/15 text-gold">
                    <item.icon className="size-4" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative pb-16 lg:pb-24">
        <div className="container-custom">
          <div className="mb-5 grid gap-2 rounded-[1.5rem] border border-white/10 bg-[#10131b]/80 p-2 shadow-[0_24px_70px_rgb(0_0_0/0.28)] backdrop-blur sm:grid-cols-3">
            {steps.map((step, index) => {
              const isComplete = getStepCompletion(form, step.fields)
              const isActive = index === activeStep

              return (
                <div
                  key={step.title}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 transition",
                    isActive || isComplete
                      ? "border-gold/25 bg-gold/10 text-foreground"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                      isComplete
                        ? "bg-gold text-[#08080b]"
                        : isActive
                          ? "border border-gold/40 text-gold"
                          : "bg-white/[0.06] text-muted-foreground"
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="size-4" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{step.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <form
              id="booking-form"
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/10 bg-[#10131b]/90 p-4 shadow-[0_30px_90px_rgb(0_0_0/0.35)] backdrop-blur-xl sm:p-7 lg:p-8"
              noValidate
            >
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-gold/80">
                    Private booking
                  </p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                    Thông tin giữ phòng
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Các trường bắt buộc được giữ tối thiểu để thao tác nhanh trên
                    mobile. Menu và ghi chú đều có thể bỏ qua.
                  </p>
                </div>
                <div className="w-fit rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-sm text-gold">
                  {completedStepCount}/{steps.length} phần hoàn tất
                </div>
              </div>

              <div className="space-y-6">
                <FormSection
                  icon={<Phone className="size-5" />}
                  title="Thông tin liên hệ"
                  description="Dùng để gọi xác nhận và giữ phòng cho bạn."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className={fieldLabelClassName}>Họ tên *</span>
                      <input
                        value={form.customerName}
                        onChange={(event) =>
                          updateForm("customerName", event.target.value)
                        }
                        placeholder="Ví dụ: Nguyễn Minh Anh"
                        className={inputClassName}
                        aria-invalid={Boolean(errors.customerName)}
                      />
                      {errors.customerName && (
                        <p className={errorClassName}>{errors.customerName}</p>
                      )}
                    </label>

                    <label className="space-y-2">
                      <span className={fieldLabelClassName}>Số điện thoại *</span>
                      <input
                        value={form.customerPhone}
                        onChange={(event) =>
                          updateForm("customerPhone", formatPhone(event.target.value))
                        }
                        inputMode="tel"
                        placeholder="0901 234 567"
                        className={inputClassName}
                        aria-invalid={Boolean(errors.customerPhone)}
                      />
                      {errors.customerPhone && (
                        <p className={errorClassName}>{errors.customerPhone}</p>
                      )}
                    </label>
                  </div>
                </FormSection>

                <FormSection
                  icon={<MapPin className="size-5" />}
                  title="Không gian mong muốn"
                  description={`Chọn chi nhánh trước, hạng phòng có thể để ${brand.name} tư vấn.`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className={fieldLabelClassName}>Chi nhánh *</span>
                      {errors.branchId && (
                        <span className={errorClassName}>{errors.branchId}</span>
                      )}
                    </div>

                     {activeBranches.length > 0 ? (
                       <div className="grid gap-3 sm:grid-cols-2">
                         {activeBranches.slice(0, TOP_BRANCH_LIMIT).map((branch) => {
                           const selected = form.branchId === branch.id
 
                           return (
                             <button
                               key={branch.id}
                               type="button"
                               onClick={() => updateForm("branchId", branch.id)}
                               className={cn(
                                 "rounded-2xl border p-4 text-left transition",
                                 selected
                                   ? "border-gold/60 bg-gold/12 shadow-[0_18px_44px_rgb(214_180_106/0.12)]"
                                   : "border-white/10 bg-white/[0.035] hover:border-gold/35"
                               )}
                             >
                               <div className="flex items-start justify-between gap-3">
                                 <div>
                                   <p className="font-semibold text-foreground">
                                     {branch.name.replace("VivaStar Karaoke - ", "")}
                                   </p>
                                   <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                     {branch.address}, {branch.district}
                                   </p>
                                 </div>
                                 <span
                                   className={cn(
                                     "grid size-6 shrink-0 place-items-center rounded-full border",
                                     selected
                                       ? "border-gold bg-gold text-[#08080b]"
                                       : "border-white/15 text-transparent"
                                   )}
                                 >
                                   <CheckCircle2 className="size-4" />
                                 </span>
                               </div>
                             </button>
                           )
                         })}
                       </div>
                     ) : (
                       <EmptyState
                         icon={<MapPin className="size-4" />}
                         title="Chưa có chi nhánh khả dụng"
                         description="Vui lòng gọi hotline để concierge kiểm tra phòng trống trực tiếp."
                       />
                     )}

                    <label className="block space-y-2 sm:hidden">
                      <span className="text-xs text-muted-foreground">
                        Hoặc chọn nhanh từ danh sách
                      </span>
                      <select
                        value={form.branchId}
                        onChange={(event) => updateForm("branchId", event.target.value)}
                        className={inputClassName}
                        aria-invalid={Boolean(errors.branchId)}
                      >
                        <option value="">Chọn chi nhánh</option>
                        {activeBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className={fieldLabelClassName}>Hạng phòng</span>
                      <span className="text-xs text-muted-foreground">
                        Có thể để nhân viên tư vấn
                      </span>
                    </div>
                     {availableRoomTiers.length > 0 ? (
                       <div className="grid gap-2 sm:grid-cols-4">
                         <TierButton
                           selected={!form.roomTier}
                           label="Tư vấn"
                           description="Theo số khách"
                           onClick={() => updateForm("roomTier", "")}
                         />
                         {availableRoomTiers.map((tier) => (
                           <TierButton
                             key={tier}
                             selected={form.roomTier === tier}
                             label={tierLabels[tier]}
                             description={tierDescriptions[tier]}
                             onClick={() => updateForm("roomTier", tier)}
                           />
                         ))}
                       </div>
                     ) : (
                       <EmptyState
                         icon={<PartyPopper className="size-4" />}
                         title="Chưa có phòng đang mở bán"
                         description="Bạn vẫn có thể gửi yêu cầu, nhân viên sẽ gọi lại khi có phòng phù hợp."
                       />
                     )}
                  </div>

                  {suggestedRooms.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#07080c]/55 p-4">
                      <p className="mb-3 text-sm font-semibold text-foreground">
                        Gợi ý phòng đang sẵn sàng
                      </p>
                      <div className="grid gap-2">
                        {suggestedRooms.map((room) => (
                          <div
                            key={room.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {room.name}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {room.capacity.min}-{room.capacity.max} khách ·{" "}
                                {formatCurrency(room.hourlyRate)}/giờ
                              </p>
                            </div>
                            <Badge className="shrink-0 bg-gold text-[#08080b]">
                              {tierLabels[room.tier]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </FormSection>

                <FormSection
                  icon={<CalendarClock className="size-5" />}
                  title="Lịch hẹn"
                  description="Chọn thời điểm dự kiến, có thể điều chỉnh khi nhân viên gọi lại."
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className={fieldLabelClassName}>Ngày đặt *</span>
                      <input
                        value={form.date}
                        onChange={(event) => updateForm("date", event.target.value)}
                        type="date"
                        min={minBookingDate}
                        className={inputClassName}
                        aria-invalid={Boolean(errors.date)}
                      />
                      {errors.date && <p className={errorClassName}>{errors.date}</p>}
                    </label>

                    <label className="space-y-2">
                      <span className={fieldLabelClassName}>Giờ bắt đầu *</span>
                      <input
                        value={form.startTime}
                        onChange={(event) => updateForm("startTime", event.target.value)}
                        type="time"
                        className={inputClassName}
                        aria-invalid={Boolean(errors.startTime)}
                      />
                      {errors.startTime && (
                        <p className={errorClassName}>{errors.startTime}</p>
                      )}
                    </label>

                    <div className="space-y-2">
                      <span className={fieldLabelClassName}>Số khách *</span>
                      <div
                        className={cn(
                          "flex h-12 items-center justify-between rounded-2xl border bg-[#07080c]/80 px-2",
                          errors.guestCount ? "border-rose-300/60" : "border-white/10"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleGuestCountChange(form.guestCount - 1)}
                          className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-foreground transition hover:bg-gold/15 hover:text-gold"
                          aria-label="Giảm số khách"
                        >
                          <Minus className="size-4" />
                        </button>
                        <input
                          value={form.guestCount}
                          onChange={(event) =>
                            handleGuestCountChange(Number(event.target.value))
                          }
                          min={MIN_GUESTS}
                          max={MAX_GUESTS}
                          type="number"
                          inputMode="numeric"
                          className="h-full w-16 bg-transparent text-center font-semibold text-foreground outline-none"
                          aria-invalid={Boolean(errors.guestCount)}
                        />
                        <button
                          type="button"
                          onClick={() => handleGuestCountChange(form.guestCount + 1)}
                          className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-foreground transition hover:bg-gold/15 hover:text-gold"
                          aria-label="Tăng số khách"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      {errors.guestCount && (
                        <p className={errorClassName}>{errors.guestCount}</p>
                      )}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={<Utensils className="size-5" />}
                  title="Menu & ghi chú"
                  description="Không bắt buộc. Thêm trước để concierge chuẩn bị tốt hơn."
                  optional
                >
                   {suggestedMenuItems.length > 0 ? (
                     <div className="grid gap-3 sm:grid-cols-2">
                       {suggestedMenuItems.map((item) => {
                         const checked = form.selectedMenuIds.includes(item.id)
 
                         return (
                           <button
                             key={item.id}
                             type="button"
                             onClick={() => toggleMenuItem(item.id)}
                             className={cn(
                               "rounded-2xl border p-4 text-left transition",
                               checked
                                 ? "border-gold/50 bg-gold/12 shadow-[0_16px_42px_rgb(214_180_106/0.12)]"
                                 : "border-white/10 bg-white/[0.035] hover:border-gold/30"
                             )}
                           >
                             <div className="flex items-start justify-between gap-3">
                               <div>
                                 <p className="text-sm font-semibold text-foreground">
                                   {item.name}
                                 </p>
                                 <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                   {item.description}
                                 </p>
                               </div>
                               <span
                                 className={cn(
                                   "grid size-6 shrink-0 place-items-center rounded-full border",
                                   checked
                                     ? "border-gold bg-gold text-[#08080b]"
                                     : "border-white/15 text-transparent"
                                 )}
                               >
                                 <CheckCircle2 className="size-4" />
                               </span>
                             </div>
                             <p className="mt-3 text-sm font-semibold text-gold">
                               {formatCurrency(item.price)}
                             </p>
                           </button>
                         )
                       })}
                     </div>
                   ) : (
                     <EmptyState
                       icon={<Utensils className="size-4" />}
                       title="Chưa có menu gợi ý"
                       description="Bạn có thể bỏ qua phần này và chọn món khi đến chi nhánh."
                     />
                   )}

                  <label className="mt-4 block space-y-2">
                    <span className={fieldLabelClassName}>Ghi chú riêng</span>
                    <textarea
                      value={form.note}
                      onChange={(event) => updateForm("note", event.target.value)}
                      placeholder="Ví dụ: sinh nhật, cần trang trí nhẹ, có trẻ em..."
                      className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#07080c]/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/50 focus:ring-2 focus:ring-gold/15"
                    />
                  </label>
                </FormSection>
              </div>

              <div className="mt-8 rounded-3xl border border-gold/20 bg-gold/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      Sẵn sàng gửi yêu cầu?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {brand.name} sẽ gọi xác nhận trước khi giữ phòng. Chưa phát sinh
                      thanh toán online.
                    </p>
                  </div>
                  <Button
                    disabled={isSubmitting}
                    className="luxury-button h-13 rounded-full px-7 text-base sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                    <ChevronRight className="ml-2 size-5" />
                  </Button>
                </div>

                {submitError && (
                  <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                    {submitError}
                  </p>
                )}
              </div>
            </form>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <BookingSummary
                form={form}
                selectedBranchName={selectedBranch?.name}
                selectedMenuItems={selectedMenuItems}
                menuTotal={menuTotal}
              />
            </aside>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/20 bg-[#07080c]/92 p-3 shadow-[0_-18px_50px_rgb(0_0_0/0.45)] backdrop-blur-xl lg:hidden">
        <div className="container-custom flex items-center justify-between gap-3 px-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {selectedBranch
                ? selectedBranch.name.replace("VivaStar Karaoke - ", "")
                : "Chưa chọn chi nhánh"}
            </p>
            <p className="text-xs text-muted-foreground">
              {form.date && form.startTime
                ? `${form.startTime} · ${form.date}`
                : "Kiểm tra tóm tắt rồi gửi yêu cầu"}
            </p>
          </div>
          <Button
            form="booking-form"
            disabled={isSubmitting}
            className="luxury-button h-11 shrink-0 rounded-full px-5 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() =>
              document
                .querySelector("form")
                ?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
            }
          >
            {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </div>
      </div>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="border-gold/20 bg-[#10131b] p-6 text-foreground shadow-[0_30px_120px_rgb(0_0_0/0.7)] sm:max-w-md">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-200">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogTitle className="text-center font-heading text-2xl font-bold">
            Đã nhận yêu cầu đặt phòng
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-7">
            {submitMessage ||
              `${brand.name} đã lưu thông tin của bạn. Nhân viên concierge sẽ gọi xác nhận chi nhánh, hạng phòng và khung giờ trong ít phút.`}
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

function FormSection({
  icon,
  title,
  description,
  children,
  optional = false,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
  optional?: boolean
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-xl font-bold text-foreground">{title}</h3>
            {optional && (
              <Badge
                variant="outline"
                className="border-white/10 bg-white/[0.04] text-muted-foreground"
              >
                Tuỳ chọn
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 grid size-9 place-items-center rounded-full bg-gold/12 text-gold">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function TierButton({
  selected,
  label,
  description,
  onClick,
}: {
  selected: boolean
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3 text-left transition",
        selected
          ? "border-gold/55 bg-gold/12 text-foreground"
          : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-gold/30"
      )}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="mt-1 block text-xs leading-5">{description}</span>
    </button>
  )
}

function BookingSummary({
  form,
  selectedBranchName,
  selectedMenuItems,
  menuTotal,
}: {
  form: BookingForm
  selectedBranchName?: string
  selectedMenuItems: MenuItem[]
  menuTotal: number
}) {
  return (
    <div className="rounded-[2rem] border border-gold/20 bg-[#10131b]/90 p-5 shadow-[0_30px_90px_rgb(0_0_0/0.35)] backdrop-blur-xl sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-full bg-gold/15 text-gold">
          <ReceiptText className="size-5" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gold/80">Tóm tắt</p>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Kiểm tra booking
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        <SummaryRow
          icon={<Users className="size-4" />}
          label="Khách hàng"
          value={form.customerName || "Chưa nhập"}
        />
        <SummaryRow
          icon={<Phone className="size-4" />}
          label="Điện thoại"
          value={form.customerPhone || "Chưa nhập"}
        />
        <SummaryRow
          icon={<MapPin className="size-4" />}
          label="Chi nhánh"
          value={selectedBranchName ?? "Chưa chọn"}
        />
        <SummaryRow
          icon={<PartyPopper className="size-4" />}
          label="Hạng phòng"
          value={form.roomTier ? tierLabels[form.roomTier] : "Nhân viên tư vấn"}
        />
        <SummaryRow
          icon={<Clock3 className="size-4" />}
          label="Thời gian"
          value={
            form.date && form.startTime
              ? `${form.startTime} · ${form.date}`
              : "Chưa chọn"
          }
        />
        <SummaryRow
          icon={<Users className="size-4" />}
          label="Số khách"
          value={form.guestCount > 0 ? `${form.guestCount} khách` : "Chưa nhập"}
        />
        {selectedMenuItems.length > 0 && (
          <SummaryRow
            icon={<Utensils className="size-4" />}
            label="Menu"
            value={`${selectedMenuItems.length} món (${formatCurrency(menuTotal)})`}
          />
        )}
        <SummaryRow
          icon={<MessageSquareText className="size-4" />}
          label="Ghi chú"
          value={form.note || "Không có"}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-gold" />
          <p className="text-xs leading-5 text-muted-foreground">
            Cam kết bảo mật thông tin. Dữ liệu chỉ dùng để liên hệ xác nhận
            booking và không chia sẻ với bên thứ ba.
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/12 text-gold">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}