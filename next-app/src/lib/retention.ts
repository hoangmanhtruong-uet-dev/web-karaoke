export type RetentionCategory = "booking" | "customer" | "session" | "auditLog" | "securityEvent" | "payment"

export type RetentionPolicy = Record<RetentionCategory, number>

export const defaultRetentionPolicy: RetentionPolicy = {
  booking: 365 * 24 * 60 * 60 * 1000,
  customer: 365 * 24 * 60 * 60 * 1000,
  session: 30 * 24 * 60 * 60 * 1000,
  auditLog: 730 * 24 * 60 * 60 * 1000,
  securityEvent: 730 * 24 * 60 * 60 * 1000,
  payment: 7 * 365 * 24 * 60 * 60 * 1000,
}

export function retentionCutoff(category: RetentionCategory, now = new Date(), policy = defaultRetentionPolicy) {
  const cutoff = new Date(now.getTime() - policy[category])
  return cutoff
}

export function selectRetentionCandidates<T extends { createdAt: Date }>(records: T[], category: RetentionCategory, now = new Date(), policy = defaultRetentionPolicy) {
  const cutoff = retentionCutoff(category, now, policy)
  return records.filter((record) => record.createdAt < cutoff)
}

export function assertRetentionDryRun(environment = process.env.NODE_ENV, dryRun = true) {
  if (environment === "production" && !dryRun) {
    throw new Error("Production retention requires an approved dry-run result and explicit operator confirmation")
  }
}
