import { describe, expect, it } from "vitest"

import { siteConfig } from "@/config/site"

describe("siteConfig", () => {
  it("uses the approved safe fallbacks", () => {
    expect(siteConfig.brandName).toBe("Royal Karaoke")
    expect(siteConfig.hotline).toBe("1900 0000")
    expect(siteConfig.hotlineHref).toBe("tel:19000000")
  })

  it("does not expose placeholder social links", () => {
    expect(siteConfig.zaloUrl).toBeNull()
    expect(siteConfig.messengerUrl).toBeNull()
    expect(siteConfig.facebookUrl).toBeNull()
  })
})
