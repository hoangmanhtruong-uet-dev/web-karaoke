import { describe, expect, it } from "vitest"
import { canTransitionContact } from "@/lib/contact-admin-service"

describe("contact status state machine",()=>{
  it.each([["new","inProgress"],["new","resolved"],["new","spam"],["inProgress","resolved"],["resolved","inProgress"],["spam","new"]] as const)("allows %s -> %s",(from,to)=>expect(canTransitionContact(from,to)).toBe(true))
  it.each([["resolved","spam"],["spam","resolved"],["new","new"]] as const)("rejects %s -> %s",(from,to)=>expect(canTransitionContact(from,to)).toBe(false))
})
