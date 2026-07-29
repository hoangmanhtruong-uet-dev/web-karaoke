import { describe, expect, it } from "vitest"
import { absoluteUrl, localBusinessSchema, pageMetadata } from "@/lib/seo"

describe("seo utilities", () => {
  it("creates absolute canonical and social URLs", () => {
    const metadata = pageMetadata("Menu", "Menu description", "/menu")
    expect(metadata.alternates?.canonical).toContain("/menu")
    expect(metadata.openGraph?.url).toContain("/menu")
    expect(absoluteUrl("/images/placeholders/general-placeholder.svg")).toMatch(/^https?:\/\//)
  })
  it("does not emit undefined business fields", () => {
    const schema = localBusinessSchema({ name: "Branch", address: "Address", city: "City", phone: "0123" })
    expect(JSON.stringify(schema)).not.toContain("undefined")
    expect(schema).not.toHaveProperty("aggregateRating")
    expect(schema).not.toHaveProperty("review")
  })
})
