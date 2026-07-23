import { afterEach, describe, expect, it, vi } from "vitest"

import { getClientIp } from "@/lib/request-context"

afterEach(() => vi.unstubAllEnvs())

describe("trusted client IP extraction", () => {
  it("ignores every proxy header unless a verified mode is configured", () => {
    const request = new Request("https://example.test", {
      headers: {
        "x-forwarded-for": "203.0.113.1",
        "x-real-ip": "203.0.113.2",
        "cf-connecting-ip": "203.0.113.3",
      },
    })
    expect(getClientIp(request)).toBe("unknown")
  })

  it("does not let X-Forwarded-For override single-proxy mode", () => {
    vi.stubEnv("TRUSTED_PROXY_MODE", "single")
    const request = new Request("https://example.test", {
      headers: {
        "x-forwarded-for": "198.51.100.99",
        "x-real-ip": "203.0.113.10",
      },
    })
    expect(getClientIp(request)).toBe("203.0.113.10")
  })

  it("rejects multi-value trusted headers instead of accepting attacker-selected first values", () => {
    vi.stubEnv("TRUSTED_PROXY_MODE", "single")
    const request = new Request("https://example.test", {
      headers: { "x-real-ip": "203.0.113.10, 198.51.100.7" },
    })
    expect(getClientIp(request)).toBe("unknown")
  })

  it("canonicalizes equivalent IPv6 representations to one limiter key", () => {
    vi.stubEnv("TRUSTED_PROXY_MODE", "single")
    const expanded = new Request("https://example.test", {
      headers: { "x-real-ip": "2001:0db8:0000:0000:0000:0000:0000:0001" },
    })
    const compressed = new Request("https://example.test", {
      headers: { "x-real-ip": "2001:db8::1" },
    })
    expect(getClientIp(expanded)).toBe("2001:db8::1")
    expect(getClientIp(compressed)).toBe("2001:db8::1")
  })
})
