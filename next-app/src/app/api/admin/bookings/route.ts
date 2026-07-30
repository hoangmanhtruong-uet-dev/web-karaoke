import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { adminServiceError } from "@/lib/admin-error-response";
import { apiSuccess } from "@/lib/api-response";
import { listAdminBookings } from "@/lib/admin-queries";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi("booking.read");
  if (!hasPrincipal(auth)) return auth.response;
  const params = Object.fromEntries(new URL(request.url).searchParams);
  try {
    return apiSuccess(await listAdminBookings(params, auth.principal));
  } catch (error) {
    return adminServiceError(error);
  }
}
