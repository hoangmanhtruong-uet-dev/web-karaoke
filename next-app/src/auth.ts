import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { authenticateAdmin } from "@/lib/auth-service"
import {
  adminTwoFactorSetupPath,
  decideAdminAccess,
} from "@/lib/admin-access-policy"
import { advanceSessionToken } from "@/lib/session-policy"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        otp: { label: "Mã xác thực", type: "text" },
        recoveryCode: { label: "Mã khôi phục", type: "text" },
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
              twoFactorVerified: user.twoFactorVerified,
              requiresTwoFactorSetup: user.requiresTwoFactorSetup,
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
        typeof token.sessionVersion === "number" &&
        typeof token.twoFactorVerified === "boolean" &&
        typeof token.requiresTwoFactorSetup === "boolean"
      ) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.sessionVersion = token.sessionVersion
        session.user.twoFactorVerified = token.twoFactorVerified
        session.user.requiresTwoFactorSetup = token.requiresTwoFactorSetup
      }
      return session
    },
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname
      if (pathname === "/admin/login" || pathname.startsWith("/api/auth"))
        return true

      const decision = decideAdminAccess(session?.user, pathname)
      if (decision === "redirect-to-setup") {
        return Response.redirect(
          new URL(adminTwoFactorSetupPath, request.nextUrl)
        )
      }

      if (pathname.startsWith("/api/admin")) {
        return (
          decision === "allow" ||
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
      if (pathname.startsWith("/admin")) return decision === "allow"
      return true
    },
  },
})
