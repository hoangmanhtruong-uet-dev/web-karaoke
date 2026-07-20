import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"
import { apiSuccess } from "@/lib/api-response"
import { listAdminContacts } from "@/lib/admin-queries"
export async function GET(request:Request){const auth=await authorizeAdminApi();if(!hasPrincipal(auth))return auth.response;return apiSuccess(await listAdminContacts(Object.fromEntries(new URL(request.url).searchParams)))}
