import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
export async function GET() {
  const auth = await authorizeAdminApi("outbox.read");
  if (!hasPrincipal(auth)) return auth.response;
  return apiSuccess(
    await prisma.outboxEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        aggregateId: true,
        status: true,
        attemptCount: true,
        nextAttemptAt: true,
        lastError: true,
        createdAt: true,
      },
    }),
  );
}
