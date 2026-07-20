import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"
import { apiSuccess } from "@/lib/api-response"
import { getAdminDashboard } from "@/lib/admin-queries"

export async function GET(){const auth=await authorizeAdminApi();if(!hasPrincipal(auth))return auth.response;return apiSuccess(await getAdminDashboard())}
