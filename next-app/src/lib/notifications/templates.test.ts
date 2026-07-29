import { siteConfig } from "@/config/site"
import { describe, expect, it } from "vitest"
import { bookingNotification, contactAdminNotification, maskRecipient } from "@/lib/notifications/templates"

const booking={code:"RK-ABC123",customerEmail:"guest@example.com",customerPhone:"0901234567",guestCount:8,startAt:new Date("2030-07-21T12:00:00Z"),endAt:new Date("2030-07-21T15:00:00Z"),status:"confirmed" as const,branch:{name:"Royal Quận 1",phone:siteConfig.hotline},room:{name:"VIP 1",tier:"vip" as const}}

describe("notification templates",()=>{
  it("contains the public booking code",()=>expect(bookingNotification("bookingCreated",booking,"guest@example.com").text).toContain("RK-ABC123"))
  it("formats booking time in Vietnam",()=>expect(bookingNotification("bookingConfirmed",booking,"guest@example.com").text).toMatch(/19:00/))
  it("does not expose idempotency or database metadata",()=>{const message=bookingNotification("bookingConfirmed",booking,"guest@example.com");expect(message.text).not.toMatch(/idempotency|requestHash|aggregateId/i)})
  it("creates reminder and cancellation content",()=>{expect(bookingNotification("bookingReminder",booking,"guest@example.com").subject).toContain("Nhắc lịch");expect(bookingNotification("bookingCancelled",booking,"guest@example.com").subject).toContain("đã hủy")})
  it("masks email and phone recipients",()=>{expect(maskRecipient("guest@example.com")).toBe("gu***@example.com");expect(maskRecipient("0901234567")).toBe("***4567")})
  it("creates a PII-minimal contact admin notification",()=>expect(contactAdminNotification("contact-1","admin@example.com").text).not.toContain("contact-1"))
})
