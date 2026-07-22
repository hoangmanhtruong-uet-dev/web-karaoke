import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"
import { apiError, apiSuccess } from "@/lib/api-response"
import { hasPermission } from "@/lib/permissions"
import {
  readJsonBody,
  RequestBodyError,
  requireSameOrigin,
} from "@/lib/request-security"
import {
  handleStaffStepUpFailure,
  releaseStaffStepUp,
  reserveStaffStepUp,
  type StaffStepUpReservation,
} from "@/lib/staff-step-up"
import {
  staffActionSchema,
  StaffSecurityError,
  updateStaff,
} from "@/lib/staff-service"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = requireSameOrigin(request)
  if (origin) return origin
  const auth = await authorizeAdminApi("staff.manage")
  if (!hasPrincipal(auth)) return auth.response
  const { id } = await params
  let stepUp: StaffStepUpReservation | undefined
  try {
    const parsed = staffActionSchema.safeParse(
      await readJsonBody(request, 8 * 1024)
    )
    if (!parsed.success)
      return apiError(
        422,
        "VALIDATION_ERROR",
        "Invalid staff action.",
        parsed.error.flatten().fieldErrors
      )
    if (
      parsed.data.action === "setRole" &&
      !hasPermission(auth.principal.role, "role.manage")
    ) {
      return apiError(
        403,
        "FORBIDDEN",
        "You do not have permission to assign staff roles."
      )
    }
    if (parsed.data.action !== "revokeSessions") {
      const admission = await reserveStaffStepUp(auth.principal.id)
      if ("response" in admission) return admission.response
      stepUp = admission.reservation
    }
    const result = await updateStaff(id, parsed.data, auth.principal, request)
    if (stepUp) await releaseStaffStepUp(stepUp)
    return apiSuccess(result)
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(error.status, error.code, "Invalid request body.")
    if (error instanceof StaffSecurityError) {
      if (stepUp) {
        const response = await handleStaffStepUpFailure(
          stepUp,
          auth.principal,
          request,
          id,
          error.code
        )
        if (response) return response
      }
      return apiError(error.status, error.code, error.message)
    }
    if (stepUp) await releaseStaffStepUp(stepUp)
    throw error
  }
}
