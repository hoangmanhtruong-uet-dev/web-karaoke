import { beforeEach, describe, expect, it, vi } from "vitest"

const createContactRequest = vi.hoisted(() => vi.fn())
const createOutboxEvent = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: (() => {
    const tx = { contactRequest: { create: createContactRequest }, outboxEvent: { create: createOutboxEvent } }
    return { ...tx, $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) }
  })(),
}))

import { POST } from "@/app/api/contact/route"

function request(body: unknown) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    createContactRequest.mockReset()
    createOutboxEvent.mockReset()
  })

  it("persists a valid contact request before returning success", async () => {
    createContactRequest.mockResolvedValue({
      id: "contact-1",
      createdAt: new Date("2030-07-21T10:00:00.000Z"),
    })

    const response = await POST(request({
      name: "Nguyễn An",
      phone: "0901234567",
      message: "Tư vấn phòng VIP",
    }))

    expect(response.status).toBe(201)
    expect(createContactRequest).toHaveBeenCalledOnce()
    expect(await response.json()).toMatchObject({ success: true, data: { contactRequestId: "contact-1" } })
  })

  it("rejects invalid data without writing", async () => {
    const response = await POST(request({ name: "", phone: "123", message: "" }))
    expect(response.status).toBe(422)
    expect(createContactRequest).not.toHaveBeenCalled()
  })

  it("does not report success when persistence fails", async () => {
    createContactRequest.mockRejectedValue(new Error("database unavailable"))
    const response = await POST(request({
      name: "Nguyễn An",
      phone: "0901234567",
      message: "Tư vấn phòng VIP",
    }))

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "CONTACT_PERSISTENCE_FAILED" },
    })
  })
})
