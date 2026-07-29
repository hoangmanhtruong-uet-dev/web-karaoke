export type PricingRuleInput = {
  id?: string; name: string; branchId: string; roomId?: string | null; roomTier?: string | null;
  ruleType: "holiday" | "special" | "weekend" | "regular" | "defaultRoom";
  specificDate?: string | null; dayOfWeek?: number | null; startMinute: number; endMinute: number;
  hourlyRate: number; priority: number; validFrom: string; validTo?: string | null; isActive?: boolean;
}
export type PricingRoom = { id: string; branchId: string; tier: string; hourlyRate: number }
export type PricingBreakdownLine = { startAt: string; endAt: string; minutes: number; unitPrice: number; amount: number; ruleId: string | null; ruleName: string; priority: number }
export type PricingResult = { total: number; breakdown: PricingBreakdownLine[]; currency: "VND" }
const VN_OFFSET_MS = 7 * 60 * 60 * 1000
const dayKey = (date: Date) => new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10)
const minuteOfDay = (date: Date) => { const d = new Date(date.getTime() + VN_OFFSET_MS); return d.getUTCHours() * 60 + d.getUTCMinutes() }
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000)
export function validatePricingRule(rule: PricingRuleInput) {
  if (!rule.name.trim() || rule.hourlyRate < 0 || !Number.isInteger(rule.hourlyRate)) throw new Error("Invalid pricing rule")
  if (rule.startMinute < 0 || rule.endMinute > 1440 || rule.startMinute >= rule.endMinute) throw new Error("Pricing time range must be within one day")
  if (rule.priority < 0 || !Number.isInteger(rule.priority)) throw new Error("Pricing priority must be a non-negative integer")
  if (rule.dayOfWeek != null && (rule.dayOfWeek < 0 || rule.dayOfWeek > 6)) throw new Error("dayOfWeek must be 0..6")
  if (rule.validTo && rule.validTo < rule.validFrom) throw new Error("Pricing validity range is invalid")
}
export function assertNoEqualPriorityOverlap(candidate: PricingRuleInput, existing: PricingRuleInput[]) {
  validatePricingRule(candidate)
  for (const rule of existing) {
    if (rule.isActive === false || rule.id === candidate.id) continue
    if (rule.branchId !== candidate.branchId || rule.priority !== candidate.priority) continue
    if (candidate.roomId && rule.roomId && candidate.roomId !== rule.roomId) continue
    if (candidate.roomTier && rule.roomTier && candidate.roomTier !== rule.roomTier) continue
    if (candidate.specificDate && rule.specificDate && candidate.specificDate !== rule.specificDate) continue
    if (candidate.dayOfWeek != null && rule.dayOfWeek != null && candidate.dayOfWeek !== rule.dayOfWeek) continue
    const startsBeforeEnd = candidate.validFrom <= (rule.validTo ?? candidate.validFrom)
    const endsAfterStart = (candidate.validTo ?? rule.validTo ?? candidate.validFrom) >= rule.validFrom
    if (startsBeforeEnd && endsAfterStart && candidate.startMinute < rule.endMinute && rule.startMinute < candidate.endMinute) throw new Error("Equal-priority pricing rules overlap")
  }
}
function matches(rule: PricingRuleInput, room: PricingRoom, at: Date) {
  const date = dayKey(at), minute = minuteOfDay(at), weekday = new Date(at.getTime() + VN_OFFSET_MS).getUTCDay()
  return rule.isActive !== false && rule.branchId === room.branchId && (!rule.roomId || rule.roomId === room.id) && (!rule.roomTier || rule.roomTier === room.tier) && (!rule.specificDate || rule.specificDate === date) && (rule.dayOfWeek == null || rule.dayOfWeek === weekday) && date >= rule.validFrom && (!rule.validTo || date <= rule.validTo) && minute >= rule.startMinute && minute < rule.endMinute
}
export function calculateRoomPrice(room: PricingRoom, startAt: Date, endAt: Date, rules: PricingRuleInput[]): PricingResult {
  if (!(startAt < endAt)) throw new Error("Pricing window must be positive")
  const lines: PricingBreakdownLine[] = []; let cursor = new Date(startAt)
  while (cursor < endAt) {
    const d = new Date(cursor.getTime() + VN_OFFSET_MS); const nextMidnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - VN_OFFSET_MS)
    const selected = rules.filter(r => matches(r, room, cursor)).sort((a,b) => b.priority - a.priority || (a.id ?? "").localeCompare(b.id ?? ""))[0]
    const boundary = selected?.endMinute ?? 1440; const minutes = Math.max(1, Math.min(Math.round((endAt.getTime()-cursor.getTime())/60000), boundary-minuteOfDay(cursor), Math.round((nextMidnight.getTime()-cursor.getTime())/60000)))
    const segmentEnd = addMinutes(cursor, minutes); const unitPrice = selected?.hourlyRate ?? room.hourlyRate
    lines.push({ startAt: cursor.toISOString(), endAt: segmentEnd.toISOString(), minutes, unitPrice, amount: Math.round(unitPrice * minutes / 60), ruleId: selected?.id ?? null, ruleName: selected?.name ?? "Giá mặc định của phòng", priority: selected?.priority ?? 0 })
    cursor = segmentEnd
  }
  return { total: lines.reduce((s,l) => s+l.amount, 0), breakdown: lines, currency: "VND" }
}
export function pricingSnapshot(result: PricingResult) { return { version: 1, ...result } }
