import { describe, expect, it } from "vitest"
import { assertNoEqualPriorityOverlap, calculateRoomPrice, type PricingRuleInput } from "@/lib/pricing-service"
const room={id:"r1",branchId:"b1",tier:"standard",hourlyRate:100000}
const at=(s:string)=>new Date(s)
const rule=(x:Partial<PricingRuleInput>):PricingRuleInput=>({name:"rule",branchId:"b1",ruleType:"regular",startMinute:0,endMinute:1440,hourlyRate:200000,priority:10,validFrom:"2026-01-01",...x})
describe("pricing service",()=>{
 it("calculates weekday default",()=>expect(calculateRoomPrice(room,at("2026-07-27T03:00:00Z"),at("2026-07-27T05:00:00Z"),[]).total).toBe(200000))
 it("applies weekend",()=>expect(calculateRoomPrice(room,at("2026-07-25T03:00:00Z"),at("2026-07-25T05:00:00Z"),[rule({dayOfWeek:6,ruleType:"weekend"})]).total).toBe(400000))
 it("applies holiday over weekend",()=>expect(calculateRoomPrice(room,at("2026-04-30T03:00:00Z"),at("2026-04-30T05:00:00Z"),[rule({specificDate:"2026-04-30",ruleType:"holiday",priority:100,hourlyRate:300000})]).total).toBe(600000))
 it("splits multiple time bands",()=>expect(calculateRoomPrice(room,at("2026-07-27T03:00:00Z"),at("2026-07-27T07:00:00Z"),[rule({startMinute:0,endMinute:720,hourlyRate:120000}),rule({startMinute:720,endMinute:1440,hourlyRate:180000})]).breakdown.map(x=>x.amount)).toEqual([240000,360000]))
 it("splits midnight",()=>expect(calculateRoomPrice(room,at("2026-07-27T16:00:00Z"),at("2026-07-27T18:00:00Z"),[rule({startMinute:0,endMinute:60,hourlyRate:300000}),rule({startMinute:60,endMinute:1440,hourlyRate:200000})]).breakdown.length).toBe(2))
 it("rejects equal-priority overlaps",()=>expect(()=>assertNoEqualPriorityOverlap(rule({id:"b",startMinute:30}),[rule({id:"a",startMinute:0,endMinute:60})])).toThrow())
})
