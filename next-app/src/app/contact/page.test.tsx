import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ContactPage from "@/app/contact/page"

function fillContactForm() {
  fireEvent.change(screen.getByPlaceholderText("Ví dụ: Nguyễn Minh Anh"), {
    target: { value: "Nguyễn An" },
  })
  fireEvent.change(screen.getByPlaceholderText("0901 234 567"), {
    target: { value: "0901234567" },
  })
  fireEvent.change(
    screen.getByPlaceholderText(/Tôi cần đặt phòng cho 12 khách/),
    { target: { value: "Tư vấn phòng VIP tối thứ bảy" } }
  )
}

describe("contact form", () => {
  it("keeps user data and does not show success when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: "CONTACT_PERSISTENCE_FAILED", message: "Không thể lưu yêu cầu." },
    }), { status: 500, headers: { "Content-Type": "application/json" } })))

    render(<ContactPage />)
    fillContactForm()
    fireEvent.click(screen.getByRole("button", { name: /Gửi liên hệ/ }))

    await screen.findByText("Không thể lưu yêu cầu.")
    expect((screen.getByPlaceholderText("Ví dụ: Nguyễn Minh Anh") as HTMLInputElement).value).toBe("Nguyễn An")
    expect((screen.getByPlaceholderText(/Tôi cần đặt phòng cho 12 khách/) as HTMLTextAreaElement).value).toContain("phòng VIP")
    expect(screen.queryByText("Gửi liên hệ thành công")).toBeNull()
  })

  it("resets and shows success only after the API confirms persistence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        contactRequestId: "contact-1",
        createdAt: "2030-07-21T10:00:00.000Z",
        message: "Đã lưu",
      },
    }), { status: 201, headers: { "Content-Type": "application/json" } })))

    render(<ContactPage />)
    fillContactForm()
    fireEvent.click(screen.getByRole("button", { name: /Gửi liên hệ/ }))

    await screen.findByText("Gửi liên hệ thành công")
    await waitFor(() => {
      expect((screen.getByPlaceholderText("Ví dụ: Nguyễn Minh Anh") as HTMLInputElement).value).toBe("")
    })
  })
})
