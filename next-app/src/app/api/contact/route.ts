import prisma from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { contactRequestSchema } from "@/lib/contact-domain"
import { enqueueOutbox } from "@/lib/outbox"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError(400, "INVALID_JSON", "Nội dung request không phải JSON hợp lệ.")
  }

  const parsed = contactRequestSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Thông tin liên hệ chưa hợp lệ.",
      parsed.error.flatten().fieldErrors
    )
  }

  try {
    const contactRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.contactRequest.create({
        data: { ...parsed.data, email: parsed.data.email || null },
        select: { id: true, createdAt: true },
      })
      await enqueueOutbox(tx, {
        eventType: "contactRequestCreated",
        aggregateType: "contactRequest",
        aggregateId: created.id,
        idempotencyKey: `contact:${created.id}:created`,
      })
      return created
    })

    return apiSuccess(
      {
        contactRequestId: contactRequest.id,
        createdAt: contactRequest.createdAt.toISOString(),
        message: "Đã nhận yêu cầu liên hệ. Nhân viên sẽ gọi lại cho bạn trong thời gian sớm nhất.",
      },
      201
    )
  } catch (error) {
    console.error("Contact request persistence failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return apiError(
      500,
      "CONTACT_PERSISTENCE_FAILED",
      "Không thể lưu yêu cầu liên hệ lúc này. Vui lòng thử lại sau."
    )
  }
}
