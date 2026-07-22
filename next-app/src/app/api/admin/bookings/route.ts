import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { apiSuccess } from "@/lib/api-response";
import { listAdminBookings } from "@/lib/admin-queries";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi("booking.read");
  if (!hasPrincipal(auth)) return auth.response;
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return apiSuccess(await listAdminBookings(params));
}
