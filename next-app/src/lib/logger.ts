import { randomUUID } from "node:crypto"

const SENSITIVE_KEY = /(password|secret|token|cookie|authorization|otp|totp|phone|email)/i

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(entry)]))
}

export type LogContext = { requestId?: string; route?: string; method?: string; userId?: string; errorCode?: string; [key: string]: unknown }

function write(level: string, message: string, context: LogContext = {}) {
  const output = JSON.stringify(redact({ timestamp: new Date().toISOString(), level, message, requestId: context.requestId ?? randomUUID(), ...context }))
  if (level === "error") console.error(output)
  else if (level === "warn" || level === "security") console.warn(output)
  else console.info(output)
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
  security: (message: string, context?: LogContext) => write("security", message, context),
}
