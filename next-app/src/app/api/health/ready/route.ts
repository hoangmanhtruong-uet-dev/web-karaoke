import prisma from "@/lib/prisma"
import { hasTrustedProxyConfiguration } from "@/lib/request-context"

const reportedConfigurationFailures = new Set<string>()

function unavailable() {
  return Response.json(
    { status: "unavailable" },
    {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "5" },
    }
  )
}

function reportConfigurationFailureOnce(reason: string) {
  if (reportedConfigurationFailures.has(reason)) return
  reportedConfigurationFailures.add(reason)
  console.error(
    JSON.stringify({
      level: "error",
      type: "security_configuration",
      reason,
    })
  )
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    if (!hasTrustedProxyConfiguration()) {
      reportConfigurationFailureOnce("trusted_proxy_not_configured")
      return unavailable()
    }
    if (process.env.AUTH_TRUST_HOST !== "true") {
      reportConfigurationFailureOnce("auth_trusted_host_not_configured")
      return unavailable()
    }
  }

  try {
    await prisma.$transaction(async (tx) => tx.$queryRaw`SELECT 1`, {
      maxWait: 1_000,
      timeout: 2_500,
    })
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return unavailable()
  }
}
