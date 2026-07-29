import { describe, expect, it } from "vitest"

import { imageFallbacks, normalizeImagePath } from "@/lib/image"

describe("image utilities", () => {
  it("normalizes missing paths to the category fallback", () => {
    expect(normalizeImagePath("/images/rooms/missing.jpg", "room")).toBe(imageFallbacks.room)
    expect(normalizeImagePath("", "menu")).toBe(imageFallbacks.menu)
    expect(normalizeImagePath(null, "branch")).toBe(imageFallbacks.branch)
  })

  it("keeps local fallback paths stable", () => {
    expect(normalizeImagePath(imageFallbacks.general)).toBe(imageFallbacks.general)
  })
})
