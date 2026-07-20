import { describe, expect, it } from "vitest"
import { maskPhone } from "@/lib/admin-queries"
describe("admin PII masking",()=>{it("masks phone on list view",()=>expect(maskPhone("0901234567")).toBe("*** *** 4567"));it("does not leak short invalid values",()=>expect(maskPhone("12")).toBe("***"))})
