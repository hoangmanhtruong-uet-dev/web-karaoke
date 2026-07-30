import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { adminServiceError } from "@/lib/admin-error-response";
import { apiSuccess } from "@/lib/api-response";
import { getAdminDashboard } from "@/lib/admin-queries";

export async function GET() {
  const auth = await authorizeAdminApi("dashboard.read");
  if (!hasPrincipal(auth)) return auth.response;
  try {
    return apiSuccess(await getAdminDashboard(auth.principal));
  } catch (error) {
    return adminServiceError(error);
  }
}
