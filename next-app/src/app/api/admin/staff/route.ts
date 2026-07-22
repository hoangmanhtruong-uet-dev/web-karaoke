import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"
import { apiError, apiSuccess } from "@/lib/api-response"
import { hasPermission } from "@/lib/permissions"
import prisma from "@/lib/prisma"
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
  createStaff,
  createStaffSchema,
  StaffSecurityError,
} from "@/lib/staff-service"

export async function GET() {
  const auth = await authorizeAdminApi("staff.read")
  if (!hasPrincipal(auth)) return auth.response
  return apiSuccess(
    await prisma.adminUser.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
  )
}

export async function POST(request: Request) {
  const origin = requireSameOrigin(request)
  if (origin) return origin
  const auth = await authorizeAdminApi("staff.manage")
  if (!hasPrincipal(auth)) return auth.response
  let stepUp: StaffStepUpReservation | undefined
  try {
    const parsed = createStaffSchema.safeParse(
      await readJsonBody(request, 8 * 1024)
    )
    if (!parsed.success)
      return apiError(
        422,
        "VALIDATION_ERROR",
        "Invalid staff account.",
        parsed.error.flatten().fieldErrors
      )
    if (!hasPermission(auth.principal.role, "role.manage")) {
      return apiError(
        403,
        "FORBIDDEN",
        "You do not have permission to assign staff roles."
      )
    }
    if (parsed.data.role === "admin") {
      const admission = await reserveStaffStepUp(auth.principal.id)
      if ("response" in admission) return admission.response
      stepUp = admission.reservation
    }
    const result = await createStaff(parsed.data, auth.principal, request)
    if (stepUp) await releaseStaffStepUp(stepUp)
    return apiSuccess(result, 201)
  } catch (error) {
    if (error instanceof RequestBodyError)
      return apiError(error.status, error.code, "Invalid request body.")
    if (error instanceof StaffSecurityError) {
      if (stepUp) {
        const response = await handleStaffStepUpFailure(
          stepUp,
          auth.principal,
          request,
          "new",
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
