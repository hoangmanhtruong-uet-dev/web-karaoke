import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role: "user" | "staff" | "admin"
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: "user" | "staff" | "admin"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "user" | "staff" | "admin"
  }
}
