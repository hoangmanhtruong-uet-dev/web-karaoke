import { logger } from "@/lib/logger"

export type NotificationMessage = {
  idempotencyKey: string
  channel: "email" | "internal"
  recipient: string
  recipientMasked: string
  subject: string
  text: string
  html: string
  template: string
}

export type NotificationResult = { providerMessageId: string }

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<NotificationResult>
}

class ConsoleNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage) {
    if (process.env.NODE_ENV === "production") throw new Error("Console notification provider is disabled in production")
    logger.info("development_notification", { template: message.template, recipientMasked: message.recipientMasked, idempotencyKey: message.idempotencyKey })
    return { providerMessageId: `dev-${message.idempotencyKey}` }
  }
}

class WebhookEmailProvider implements NotificationProvider {
  async send(message: NotificationMessage) {
    const url = process.env.EMAIL_WEBHOOK_URL
    const apiKey = process.env.EMAIL_API_KEY
    const from = process.env.EMAIL_FROM
    if (!url || !apiKey || !from) throw new Error("Email webhook provider is not configured")
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "Idempotency-Key": message.idempotencyKey },
      body: JSON.stringify({ from, to: message.recipient, subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`)
    const body = await response.json() as { id?: unknown }
    return { providerMessageId: typeof body.id === "string" ? body.id : message.idempotencyKey }
  }
}

export function getNotificationProvider(): NotificationProvider {
  const provider = process.env.EMAIL_PROVIDER ?? (process.env.NODE_ENV === "production" ? "" : "console")
  if (provider === "console") return new ConsoleNotificationProvider()
  if (provider === "webhook") return new WebhookEmailProvider()
  throw new Error("A production notification provider must be configured")
}
