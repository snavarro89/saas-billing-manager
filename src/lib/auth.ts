import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[AUTH] 🔐 Authorization attempt started")
        console.log("[AUTH] Credentials received:", {
          hasUsername: !!credentials?.username,
          hasPassword: !!credentials?.password,
          username: credentials?.username ? String(credentials.username).substring(0, 3) + "***" : undefined
        })

        if (!credentials?.username || !credentials?.password) {
          console.log("[AUTH] ❌ Missing credentials")
          return null
        }

        try {
          // Lazy import Prisma to avoid loading in Edge runtime
          console.log("[AUTH] 📦 Importing Prisma client...")
          const { prisma } = await import("./db")
          console.log("[AUTH] ✅ Prisma client imported")

          console.log("[AUTH] 🔍 Querying user:", credentials.username as string)
          const user = await prisma.user.findUnique({
            where: { username: credentials.username as string }
          })

          console.log("[AUTH] User query result:", {
            found: !!user,
            userId: user?.id,
            username: user?.username
          })

          if (!user) {
            console.log("[AUTH] ❌ User not found")
            return null
          }

          console.log("[AUTH] 🔒 Validating password...")
          const isValid = await bcrypt.compare(credentials.password as string, user.password)

          if (!isValid) {
            console.log("[AUTH] ❌ Invalid password")
            return null
          }

          console.log("[AUTH] ✅ Authorization successful for user:", user.username)
          return {
            id: user.id,
            username: user.username,
            role: user.role || "user"
          }
        } catch (error) {
          console.error("[AUTH] ❌ Authorization error:", error)
          console.error("[AUTH] Error details:", {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            code: (error as any)?.code,
            meta: (error as any)?.meta,
            stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined
          })
          throw error
        }
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).username = token.username as string
        (session.user as any).role = token.role as string
      }
      return session
    }
  }
})

