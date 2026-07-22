import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { authenticateAdmin } from "@/lib/auth-service"
import { advanceSessionToken } from "@/lib/session-policy"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: (credentials, request) =>
        authenticateAdmin(credentials, request),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      return advanceSessionToken(
        token,
        user?.id
          ? {
              id: user.id,
              role: user.role,
              sessionVersion: user.sessionVersion,
            }
          : undefined
      )
    },
    session({ session, token }) {
      if (
        session.user &&
        typeof token.id === "string" &&
        (token.role === "user" ||
          token.role === "staff" ||
          token.role === "manager" ||
          token.role === "admin") &&
        typeof token.sessionVersion === "number"
      ) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.sessionVersion = token.sessionVersion
      }
      return session
    },
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname
      if (pathname === "/admin/login" || pathname.startsWith("/api/auth"))
        return true
      const hasAdminSession =
        session?.user.role === "staff" ||
        session?.user.role === "manager" ||
        session?.user.role === "admin"
      if (pathname.startsWith("/api/admin")) {
        return (
          hasAdminSession ||
          Response.json(
            {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "Authentication required.",
              },
            },
            { status: 401, headers: { "Cache-Control": "no-store" } }
          )
        )
      }
      if (pathname.startsWith("/admin")) return hasAdminSession
      return true
    },
  },
})
