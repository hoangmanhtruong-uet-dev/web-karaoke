import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/request-security";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const auth = await authorizeAdminApi("outbox.retry");
  if (!hasPrincipal(auth)) return auth.response;
  const { id } = await params;
  const event = await prisma.outboxEvent.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!event)
    return apiError(
      404,
      "OUTBOX_EVENT_NOT_FOUND",
      "Không tìm thấy outbox event.",
    );
  if (event.status !== "deadLetter")
    return apiError(
      409,
      "OUTBOX_EVENT_NOT_RETRYABLE",
      "Chỉ dead-letter event mới được retry thủ công.",
    );
  await prisma.$transaction([
    prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        lockedAt: null,
        lockToken: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.principal.id,
        actorRole: auth.principal.role,
        action: "outbox.retried",
        entityType: "outboxEvent",
        entityId: id,
      },
    }),
  ]);
  return apiSuccess({ id, status: "pending" });
}
