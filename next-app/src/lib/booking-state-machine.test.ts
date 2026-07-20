import { describe, expect, it } from "vitest"
import { BOOKING_TRANSITIONS, canTransitionBooking, getBookingTransitionTimestamp, shouldExpireBooking } from "@/lib/booking-state-machine"

describe("booking state machine",()=>{
  it.each([
    ["pending","confirmed"],["pending","rejected"],["pending","cancelled"],["pending","expired"],
    ["confirmed","checkedIn"],["confirmed","cancelled"],["checkedIn","completed"],
  ] as const)("allows %s -> %s",(from,to)=>expect(canTransitionBooking(from,to)).toBe(true))
  it.each([
    ["expired","confirmed"],["rejected","confirmed"],["checkedIn","pending"],["cancelled","confirmed"],["completed","pending"],
  ] as const)("rejects %s -> %s",(from,to)=>expect(canTransitionBooking(from,to)).toBe(false))
  it("exposes only centralized valid actions",()=>expect(BOOKING_TRANSITIONS.pending).toEqual(["confirmed","rejected","cancelled","expired"]))
  it("sets lifecycle timestamps",()=>{const now=new Date("2030-01-01");expect(getBookingTransitionTimestamp("confirmed",now)).toEqual({confirmedAt:now});expect(getBookingTransitionTimestamp("expired",now)).toEqual({expiredAt:now})})
})

describe("booking expiry predicate",()=>{
  const now=new Date("2030-01-01T10:00:00Z")
  it("expires a due pending booking",()=>expect(shouldExpireBooking("pending",new Date("2030-01-01T09:59:00Z"),now)).toBe(true))
  it("does not expire a future pending booking",()=>expect(shouldExpireBooking("pending",new Date("2030-01-01T10:01:00Z"),now)).toBe(false))
  it.each(["confirmed","cancelled","expired"] as const)("does not expire %s",(status)=>expect(shouldExpireBooking(status,new Date("2029-01-01"),now)).toBe(false))
})
