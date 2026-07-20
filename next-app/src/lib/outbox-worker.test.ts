import { describe, expect, it } from "vitest"
import { nextOutboxAttempt } from "@/lib/outbox-worker"

describe("outbox retry backoff",()=>{
  const now=new Date("2030-01-01T00:00:00Z")
  it.each([[1,1],[2,5],[3,30],[4,120],[5,120]] as const)("attempt %s waits %s minutes",(attempt,minutes)=>expect(nextOutboxAttempt(attempt,now).getTime()-now.getTime()).toBe(minutes*60_000))
})
