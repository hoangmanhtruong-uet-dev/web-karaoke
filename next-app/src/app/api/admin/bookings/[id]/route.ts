import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { adminServiceError } from "@/lib/admin-error-response";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAdminBooking, getBookingAudit } from "@/lib/admin-queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminApi("booking.read");
  if (!hasPrincipal(auth)) return auth.response;
  const { id } = await params;
  try {
    const booking = await getAdminBooking(id, auth.principal);
    if (!booking)
      return apiError(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking.");
    return apiSuccess({ booking, audit: await getBookingAudit(id, auth.principal) });
  } catch (error) {
    return adminServiceError(error);
  }
}
