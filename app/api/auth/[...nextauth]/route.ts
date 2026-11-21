// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailInput = credentials.email.toLowerCase().trim();
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD?.trim();

        // 1. Check if matching Master Admin credentials from .env.local
        if (adminEmail && adminPassword && emailInput === adminEmail) {
          if (credentials.password === adminPassword) {
            const requestedRole = (credentials.role || "admin").toLowerCase();
            return {
              id: "admin-master",
              name: process.env.ADMIN_NAME || "Administrator",
              email: process.env.ADMIN_EMAIL,
              role: requestedRole,
              actualRole: "admin",
              roleSelected: true,
              image: null,
            };
          }
          return null;
        }

        // 2. Otherwise verify against MongoDB User collection
        await dbConnect();
        const user = await User.findOne({ email: emailInput });
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        const actualRole = (user.role || "telecaller").toLowerCase();
        const requestedRole = (credentials.role || actualRole).toLowerCase();

        // Security check: Lower roles cannot escalate to higher roles on login
        if (actualRole === "telecaller" && (requestedRole === "manager" || requestedRole === "admin")) {
          throw new Error(
            `Access Denied: Your account is registered as a Telecaller. You cannot log in as ${
              requestedRole === "admin" ? "Admin" : "Manager"
            }. Please select 'Telecaller' to sign in.`
          );
        }

        if (actualRole === "manager" && requestedRole === "admin") {
          throw new Error(
            "Access Denied: Your account is registered as a Manager. You cannot log in as Admin. Please select 'Manager' to sign in."
          );
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: requestedRole,
          actualRole: actualRole,
          roleSelected: true,
          image: user.avatar ?? null,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();
        const email = user.email?.toLowerCase();
        let dbUser = await User.findOne({ email });
        if (!dbUser) {
          dbUser = await User.create({
            name: user.name || "Google User",
            email,
            avatar: user.image,
            role: "viewer",
            roleSelected: false,
          });
        }
        user.id = dbUser._id.toString();
        (user as any).role = dbUser.role;
        (user as any).roleSelected = dbUser.roleSelected;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.actualRole = (user as any).actualRole || (user as any).role;
        token.roleSelected = (user as any).roleSelected;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
        token.roleSelected = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).actualRole = token.actualRole || token.role;
        (session.user as any).roleSelected = token.roleSelected;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
