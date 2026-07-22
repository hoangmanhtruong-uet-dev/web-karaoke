import { z } from "zod";
import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { addAdminNote } from "@/lib/admin-booking-service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { readJsonBodyResult, requireSameOrigin } from "@/lib/request-security";
const schema = z.object({ content: z.string().trim().min(1).max(1000) });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const auth = await authorizeAdminApi("booking.update");
  if (!hasPrincipal(auth)) return auth.response;
  const body = await readJsonBodyResult(request);
  if ("response" in body) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success)
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Ghi chú không hợp lệ.",
      parsed.error.flatten().fieldErrors,
    );
  const { id } = await params;
  return apiSuccess(
    await addAdminNote({
      bookingId: id,
      content: parsed.data.content,
      actor: auth.principal,
    }),
    201,
  );
}
