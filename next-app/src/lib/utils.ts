import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPhone(value: string) {
  const digits = normalizePhoneInput(value)

  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

export function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 10)
}

export function isValidVietnamPhone(value: string) {
  const digits = value.replace(/\D/g, "")

  return /^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(digits)
}
