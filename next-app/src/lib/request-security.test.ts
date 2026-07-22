import { afterEach, describe, expect, it } from "vitest"

import {
  readJsonBody,
  RequestBodyError,
  validateSameOrigin,
  verifyCronSecret,
} from "@/lib/request-security"

const originalSecret = process.env.CRON_SECRET
afterEach(() => {
  process.env.CRON_SECRET = originalSecret
})

describe("request security", () => {
  it("accepts a matching origin and protocol", () => {
    expect(
      validateSameOrigin(
        new Request("https://example.com/api", {
          headers: { origin: "https://example.com", host: "example.com" },
        })
      )
    ).toBe(true)
  })

  it("uses a safe referer fallback", () => {
    expect(
      validateSameOrigin(
        new Request("https://example.com/api", {
          headers: { referer: "https://example.com/form", host: "example.com" },
        })
      )
    ).toBe(true)
  })

  it("rejects cross-origin and protocol downgrade", () => {
    expect(
      validateSameOrigin(
        new Request("https://example.com/api", {
          headers: { origin: "https://evil.example", host: "example.com" },
        })
      )
    ).toBe(false)
    expect(
      validateSameOrigin(
        new Request("https://example.com/api", {
          headers: { origin: "http://example.com", host: "example.com" },
        })
      )
    ).toBe(false)
  })

  it("rejects oversized and non-JSON bodies", async () => {
    await expect(
      readJsonBody(
        new Request("https://example.com", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value: "x".repeat(100) }),
        }),
        20
      )
    ).rejects.toMatchObject({ status: 413 })
    await expect(
      readJsonBody(
        new Request("https://example.com", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "x",
        }),
        20
      )
    ).rejects.toBeInstanceOf(RequestBodyError)
  })

  it("cancels a chunked body as soon as the byte limit is crossed", async () => {
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(`{"value":"${"x".repeat(64)}`)
        )
      },
      cancel() {
        cancelled = true
      },
    })
    const requestInit: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    }

    await expect(
      readJsonBody(new Request("https://example.com", requestInit), 20)
    ).rejects.toMatchObject({ status: 413 })
    expect(cancelled).toBe(true)
  })

  it("uses constant-time cron credential comparison and fails closed", () => {
    process.env.CRON_SECRET = "correct-secret"
    expect(
      verifyCronSecret(
        new Request("https://example.com", {
          headers: { authorization: "Bearer wrong-secret" },
        })
      )
    ).toBe(false)
    expect(
      verifyCronSecret(
        new Request("https://example.com", {
          headers: { authorization: "Bearer correct-secret" },
        })
      )
    ).toBe(true)
    delete process.env.CRON_SECRET
    expect(verifyCronSecret(new Request("https://example.com"))).toBe(false)
  })
})
