import prisma from "@/lib/prisma"
import { hasTrustedProxyConfiguration } from "@/lib/request-context"

function unavailable() {
  return Response.json(
    { status: "unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  )
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    if (!hasTrustedProxyConfiguration()) {
      console.error(
        JSON.stringify({
          level: "error",
          type: "security_configuration",
          reason: "trusted_proxy_not_configured",
        })
      )
      return unavailable()
    }
    if (process.env.AUTH_TRUST_HOST !== "true") {
      console.error(
        JSON.stringify({
          level: "error",
          type: "security_configuration",
          reason: "auth_trusted_host_not_configured",
        })
      )
      return unavailable()
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return unavailable()
  }
}
