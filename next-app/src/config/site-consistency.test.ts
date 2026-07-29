import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const sourceFiles = [
  "../app/contact/page.tsx",
  "../components/sections/ContactCTA.tsx",
  "../data/branches.ts",
  "../app/branches/page.tsx",
]

describe("brand consistency", () => {
  it("keeps legacy brand and placeholder social links out of important UI sources", () => {
    for (const relativePath of sourceFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8")

      expect(source).not.toContain("Viva" + "Star")
      expect(source).not.toContain("viva" + "star")
      expect(source).not.toContain("zalo.me/" + "1900123456")
      expect(source).not.toContain("m.me/" + "royalkaraoke")
      expect(source).not.toContain('href: "#"')
    }
  })
})
