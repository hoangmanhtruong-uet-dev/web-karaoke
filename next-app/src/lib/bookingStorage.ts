import { promises as fs } from "fs"
import path from "path"

export type BookingInput = {
  customerName: string
  customerPhone: string
  branchId: string
  roomTier?: string
  date: string
  startTime: string
  guestCount: number
  selectedMenuIds?: string[]
  note?: string
}

export type StoredBooking = BookingInput & {
  id: string
  status: "pending"
  createdAt: string
}

const BOOKINGS_FILE = path.join(process.cwd(), "data", "bookings.json")

/**
 * Đọc danh sách booking từ file JSON
 */
export async function getBookings(): Promise<StoredBooking[]> {
  try {
    const data = await fs.readFile(BOOKINGS_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    // Nếu file chưa tồn tại, trả về mảng rỗng
    return []
  }
}

/**
 * Ghi danh sách booking vào file JSON
 */
export async function saveBookings(bookings: StoredBooking[]): Promise<void> {
  await fs.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true })
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2))
}

/**
 * Thêm booking mới
 */
export async function addBooking(booking: Omit<StoredBooking, "id" | "createdAt" | "status">): Promise<StoredBooking> {
  const bookings = await getBookings()
  
  const newBooking: StoredBooking = {
    ...booking,
    id: `booking-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  
  bookings.push(newBooking)
  await saveBookings(bookings)
  
  return newBooking
}