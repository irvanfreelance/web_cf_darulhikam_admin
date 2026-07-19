import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    /**
     * Runs immediately after a successful provider sign-in.
     * Block the sign-in if the email is NOT in the `admins` table with ACTIVE status.
     */
    async signIn({ user }) {
      if (!user?.email) return false;

      try {
        const result = await query(
          `SELECT id, status FROM admins WHERE email = $1 LIMIT 1`,
          [user.email]
        );

        if (result.rowCount === 0) {
          // Email not registered as admin → deny
          return false;
        }

        const admin = result.rows[0];
        if (admin.status !== "ACTIVE") {
          // Admin exists but is inactive → deny
          return false;
        }

        return true;
      } catch (err) {
        console.error("[NextAuth] signIn callback error:", err);
        return false;
      }
    },

    /**
     * Enrich the JWT token with admin data from DB.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const result = await query(
            `SELECT id, name, email, role FROM admins WHERE email = $1 AND status = 'ACTIVE' LIMIT 1`,
            [user.email]
          );
          if (result.rowCount && result.rowCount > 0) {
            const admin = result.rows[0];
            token.adminId = admin.id;
            token.role = admin.role;
            token.name = admin.name;
          }
        } catch (err) {
          console.error("[NextAuth] jwt callback error:", err);
        }
      }
      return token;
    },

    /**
     * Expose admin data to the client session.
     */
    async session({ session, token }) {
      if (token) {
        session.user.adminId = token.adminId as number;
        session.user.role = token.role as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
