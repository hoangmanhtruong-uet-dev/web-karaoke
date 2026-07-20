import { z } from "zod"

import { isValidVietnamPhone } from "@/lib/utils"

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(120),
  phone: z
    .string()
    .trim()
    .refine(isValidVietnamPhone, "Số điện thoại chưa đúng định dạng."),
  email: z.string().trim().email("Email không hợp lệ.").max(255).optional(),
  message: z.string().trim().min(1, "Vui lòng nhập nội dung cần tư vấn.").max(2000),
})

export type ContactRequestInput = z.infer<typeof contactRequestSchema>
