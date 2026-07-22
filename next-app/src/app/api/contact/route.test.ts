import { beforeEach, describe, expect, it, vi } from "vitest"

const createContactRequest = vi.hoisted(() => vi.fn())
const createOutboxEvent = vi.hoisted(() => vi.fn())
const consumeRateLimit = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: (() => {
    const tx = {
      contactRequest: { create: createContactRequest },
      outboxEvent: { create: createOutboxEvent },
    }
    return {
      ...tx,
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    }
  })(),
}))
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit,
  rateLimitResponse: () => new Response(null, { status: 429 }),
}))
vi.mock("@/lib/security-audit", () => ({ emitSecurityAlert: vi.fn() }))

import { POST } from "@/app/api/contact/route"

function request(body: unknown) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
      Host: "localhost",
    },
    body: JSON.stringify(body),
  })
}

const allowed = {
  allowed: true,
  retryAfterSeconds: 0,
  remaining: 9,
  newlyBlocked: false,
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    createContactRequest.mockReset()
    createOutboxEvent.mockReset()
    consumeRateLimit.mockReset()
    consumeRateLimit.mockResolvedValue(allowed)
  })

  it("rejects a cross-origin request", async () => {
    const response = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
          Host: "localhost",
        },
        body: JSON.stringify({
          name: "Nguyen An",
          phone: "0901234567",
          message: "VIP",
        }),
      })
    )

    expect(response.status).toBe(403)
    expect(createContactRequest).not.toHaveBeenCalled()
  })

  it("persists a valid contact request before returning success", async () => {
    createContactRequest.mockResolvedValue({
      id: "contact-1",
      createdAt: new Date("2030-07-21T10:00:00.000Z"),
    })

    const response = await POST(
      request({
        name: "Nguyen An",
        phone: "0901234567",
        message: "Tu van phong VIP",
      })
    )

    expect(response.status).toBe(201)
    expect(createContactRequest).toHaveBeenCalledOnce()
    expect(createOutboxEvent).toHaveBeenCalledOnce()
    expect(await response.json()).toMatchObject({
      success: true,
      data: { contactRequestId: "contact-1" },
    })
  })

  it("rejects invalid data without writing", async () => {
    const response = await POST(
      request({ name: "", phone: "123", message: "" })
    )

    expect(response.status).toBe(422)
    expect(createContactRequest).not.toHaveBeenCalled()
  })

  it("does not report success when persistence fails", async () => {
    createContactRequest.mockRejectedValue(new Error("database unavailable"))
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    const response = await POST(
      request({
        name: "Nguyen An",
        phone: "0901234567",
        message: "Tu van phong VIP",
      })
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "CONTACT_PERSISTENCE_FAILED" },
    })
    errorSpy.mockRestore()
  })

  it("rejects a filled honeypot without writing", async () => {
    const response = await POST(
      request({
        name: "Spam Bot",
        phone: "0901234567",
        message: "spam",
        website: "https://spam.example",
      })
    )

    expect(response.status).toBe(422)
    expect(createContactRequest).not.toHaveBeenCalled()
  })

  it("normalizes +84 phones and skips notifications when the global quota is exhausted", async () => {
    consumeRateLimit
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce({
        allowed: false,
        retryAfterSeconds: 300,
        remaining: 0,
        newlyBlocked: false,
      })
    createContactRequest.mockResolvedValue({
      id: "contact-2",
      createdAt: new Date("2030-07-21T10:00:00.000Z"),
    })

    const response = await POST(
      request({
        name: "Nguyen An",
        phone: "84901234567",
        message: "Tu van phong VIP",
        website: "",
      })
    )

    expect(response.status).toBe(201)
    expect(createContactRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "0901234567" }),
      })
    )
    expect(createOutboxEvent).not.toHaveBeenCalled()
  })
})
