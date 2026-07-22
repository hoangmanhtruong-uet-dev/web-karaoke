import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { transitionBooking } from "@/lib/admin-booking-service";
import { adminServiceError } from "@/lib/admin-error-response";
import { apiError, apiSuccess } from "@/lib/api-response";
import { readJsonBodyResult, requireSameOrigin } from "@/lib/request-security";

const schema = z.object({
  status: z
    .nativeEnum(BookingStatus)
    .refine(
      (status) =>
        [
          "confirmed",
          "rejected",
          "cancelled",
          "checkedIn",
          "completed",
        ].includes(status),
      "Transition không được hỗ trợ.",
    ),
});
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
      "Transition không hợp lệ.",
      parsed.error.flatten().fieldErrors,
    );
  try {
    const { id } = await params;
    return apiSuccess(
      await transitionBooking(id, parsed.data.status, auth.principal),
    );
  } catch (error) {
    return adminServiceError(error);
  }
}
