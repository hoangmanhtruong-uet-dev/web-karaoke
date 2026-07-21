import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import BookingPage from "@/app/booking/page"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("booking submit flow", () => {
  it("sends only one POST when two submit events happen before the first finishes", async () => {
    let resolveBooking: (response: Response) => void = () => undefined
    const bookingResponse = new Promise<Response>((resolve) => {
      resolveBooking = resolve
    })

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === "POST") return bookingResponse
      if (url.includes("/api/branches")) {
        return Promise.resolve(jsonResponse({ success: true, data: { branches: [{
          id: "branch-1",
          name: "Royal Karaoke - Quận 1",
          slug: "quan-1",
          address: "1 Nguyễn Huệ",
          district: "Quận 1",
          city: "TP.HCM",
          phone: "0901234567",
          email: null,
          openingHours: { open: "10:00", close: "02:00" },
          amenities: [],
          status: "active",
          imageUrl: null,
        }] } }))
      }
      if (url.endsWith("/api/rooms")) {
        return Promise.resolve(jsonResponse({ success: true, data: { rooms: [{
          id: "room-1",
          branchId: "branch-1",
          name: "VIP 1",
          slug: "vip-1",
          tier: "vip",
          capacity: { min: 2, max: 10 },
          hourlyRate: 500_000,
          features: [],
          status: "available",
          imageUrl: null,
        }] } }))
      }
      return Promise.resolve(jsonResponse({ success: true, data: { menuItems: [] } }))
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<BookingPage />)
    await screen.findByText("Thông tin giữ phòng")

    fireEvent.change(screen.getByPlaceholderText("Ví dụ: Nguyễn Minh Anh"), {
      target: { value: "Nguyễn An" },
    })
    fireEvent.change(screen.getByPlaceholderText("0901 234 567"), {
      target: { value: "0901 234 567" },
    })
    expect((screen.getByPlaceholderText("0901 234 567") as HTMLInputElement).value).toBe("0901234567")
    fireEvent.click(screen.getByRole("button", { name: /Quận 1/ }))
    fireEvent.change(screen.getByLabelText("Ngày đặt *"), {
      target: { value: "2030-07-21" },
    })
    fireEvent.change(screen.getByLabelText("Giờ bắt đầu *"), {
      target: { value: "19:00" },
    })

    const form = document.getElementById("booking-form") as HTMLFormElement
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")
      expect(postCalls).toHaveLength(1)
      expect(new Headers(postCalls[0][1]?.headers).get("Idempotency-Key")).toBeTruthy()
    })

    resolveBooking(jsonResponse({
      success: true,
      data: { bookingId: "booking-1", replayed: false, expiresAt: "2030-07-21T15:15:00.000Z", message: "Đã lưu" },
    }, 201))
  })
})
