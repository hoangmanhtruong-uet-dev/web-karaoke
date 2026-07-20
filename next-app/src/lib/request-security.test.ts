import { afterEach, describe, expect, it } from "vitest"
import { validateSameOrigin, verifyCronSecret } from "@/lib/request-security"

const originalSecret=process.env.CRON_SECRET
afterEach(()=>{process.env.CRON_SECRET=originalSecret})

describe("request security",()=>{
  it("accepts same-origin admin mutations",()=>expect(validateSameOrigin(new Request("https://example.com/api",{headers:{origin:"https://example.com",host:"example.com"}}))).toBe(true))
  it("rejects cross-origin admin mutations",()=>expect(validateSameOrigin(new Request("https://example.com/api",{headers:{origin:"https://evil.example",host:"example.com"}}))).toBe(false))
  it("rejects an incorrect cron secret",()=>{process.env.CRON_SECRET="correct-secret";expect(verifyCronSecret(new Request("https://example.com",{headers:{authorization:"Bearer wrong-secret"}}))).toBe(false)})
  it("accepts the configured cron secret",()=>{process.env.CRON_SECRET="correct-secret";expect(verifyCronSecret(new Request("https://example.com",{headers:{authorization:"Bearer correct-secret"}}))).toBe(true)})
  it("fails closed when cron secret is missing",()=>{delete process.env.CRON_SECRET;expect(verifyCronSecret(new Request("https://example.com"))).toBe(false)})
})
