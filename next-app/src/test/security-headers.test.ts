import { describe, expect, it } from "vitest"

import nextConfig from "../../next.config"

describe("security headers", () => {
  it("sets a browser security policy globally", async () => {
    expect(nextConfig.poweredByHeader).toBe(false)
    const rules = await nextConfig.headers?.()
    const global = rules?.find((rule) => rule.source === "/:path*")
    const headers = new Map(global?.headers.map((header) => [header.key, header.value]))
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'")
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'")
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")
    expect(headers.get("Permissions-Policy")).toContain("microphone=()")
  })

  it("prevents caching admin pages and APIs", async () => {
    const rules = await nextConfig.headers?.()
    for (const source of ["/admin/:path*", "/api/admin/:path*"]) {
      const rule = rules?.find((candidate) => candidate.source === source)
      expect(rule?.headers.some((header) => header.key === "Cache-Control" && header.value.includes("no-store"))).toBe(true)
    }
  })
})
