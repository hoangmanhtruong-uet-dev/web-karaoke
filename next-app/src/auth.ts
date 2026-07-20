import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { authenticateAdmin } from "@/lib/auth-service"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: authenticateAdmin,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (
        session.user &&
        typeof token.id === "string" &&
        (token.role === "user" || token.role === "staff" || token.role === "admin")
      ) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname
      if (pathname === "/admin/login" || pathname.startsWith("/api/auth")) return true
      if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        return session?.user.role === "staff" || session?.user.role === "admin"
      }
      return true
    },
  },
})
