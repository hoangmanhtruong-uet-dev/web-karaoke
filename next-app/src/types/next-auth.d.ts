import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role: "user" | "staff" | "manager" | "admin"
    sessionVersion: number
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: "user" | "staff" | "manager" | "admin"
      sessionVersion: number
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "user" | "staff" | "manager" | "admin"
    sessionVersion?: number
    absoluteExpiresAt?: number
    lastActivityAt?: number
  }
}
