import { ContactStatus } from "@prisma/client";
import { z } from "zod";
import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { apiError, apiSuccess } from "@/lib/api-response";
import { transitionContactStatus } from "@/lib/contact-admin-service";
import { readJsonBodyResult, requireSameOrigin } from "@/lib/request-security";
const schema = z.object({ status: z.nativeEnum(ContactStatus) });
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const auth = await authorizeAdminApi("contact.update");
  if (!hasPrincipal(auth)) return auth.response;
  const body = await readJsonBodyResult(request);
  if ("response" in body) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success)
    return apiError(
      422,
      "INVALID_CONTACT_STATUS",
      "Trạng thái liên hệ không hợp lệ.",
    );
  try {
    const { id } = await params;
    const result = await transitionContactStatus(
      id,
      parsed.data.status,
      auth.principal,
    );
    return result
      ? apiSuccess(result)
      : apiError(
          404,
          "CONTACT_REQUEST_NOT_FOUND",
          "Không tìm thấy yêu cầu liên hệ.",
        );
  } catch (error) {
    return apiError(
      409,
      error instanceof Error && error.message === "INVALID_CONTACT_STATUS"
        ? "INVALID_CONTACT_STATUS"
        : "CONTACT_CONFLICT",
      "Không thể chuyển trạng thái liên hệ.",
    );
  }
}
