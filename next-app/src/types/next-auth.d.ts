import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role: "user" | "staff" | "manager" | "admin"
    sessionVersion: number
    twoFactorVerified: boolean
    requiresTwoFactorSetup: boolean
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: "user" | "staff" | "manager" | "admin"
      sessionVersion: number
      twoFactorVerified: boolean
      requiresTwoFactorSetup: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "user" | "staff" | "manager" | "admin"
    sessionVersion?: number
    twoFactorVerified?: boolean
    requiresTwoFactorSetup?: boolean
    absoluteExpiresAt?: number
    lastActivityAt?: number
  }
}
