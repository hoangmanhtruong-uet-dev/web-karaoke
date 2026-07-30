import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"
import { AdminBranchScopeError } from "@/lib/admin-branch-scope"
import { adminServiceError } from "@/lib/admin-error-response"
import { apiError, apiSuccess } from "@/lib/api-response"
import { CalendarQueryError, listCalendarBookings } from "@/lib/calendar-query"
export async function GET(request:Request){const auth=await authorizeAdminApi("booking.read");if(!hasPrincipal(auth))return auth.response;const u=new URL(request.url);try{return apiSuccess(await listCalendarBookings({from:u.searchParams.get("from"),to:u.searchParams.get("to"),branchId:u.searchParams.get("branchId")||undefined,roomId:u.searchParams.get("roomId")||undefined},auth.principal))}catch(e){if(e instanceof AdminBranchScopeError)return adminServiceError(e);if(e instanceof CalendarQueryError)return apiError(422,"INVALID_DATE_RANGE",e.message);return adminServiceError(e)}}