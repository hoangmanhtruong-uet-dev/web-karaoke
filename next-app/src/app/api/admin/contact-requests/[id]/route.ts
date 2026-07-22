import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api";
import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminApi("contact.read");
  if (!hasPrincipal(auth)) return auth.response;
  const { id } = await params;
  const contact = await prisma.contactRequest.findUnique({
    where: { id },
    include: {
      adminNotes: {
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
  return contact
    ? apiSuccess(contact)
    : apiError(
        404,
        "CONTACT_REQUEST_NOT_FOUND",
        "Không tìm thấy yêu cầu liên hệ.",
      );
}
