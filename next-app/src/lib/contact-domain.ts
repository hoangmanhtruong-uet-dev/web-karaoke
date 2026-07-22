import { z } from "zod"

import { canonicalizeVietnamPhone, isValidVietnamPhone } from "@/lib/utils"

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .refine(isValidVietnamPhone, "Invalid phone number.")
    .transform(canonicalizeVietnamPhone),
  email: z.string().trim().email("Invalid email.").max(255).optional(),
  message: z.string().trim().min(1).max(2000),
  // Honeypot: real clients leave this field absent/empty.
  website: z.string().trim().max(0).optional(),
})

export type ContactRequestInput = z.infer<typeof contactRequestSchema>
