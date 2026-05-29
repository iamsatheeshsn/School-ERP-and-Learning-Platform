import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            studentProfile: true,
            teacherProfile: true,
            parentProfile: true,
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.hashedPassword);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          studentProfileId: user.studentProfile?.id,
          teacherProfileId: user.teacherProfile?.id,
          parentProfileId: user.parentProfile?.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser;
        token.id = u.id;
        token.role = u.role;
        token.avatar = u.avatar;
        token.studentProfileId = u.studentProfileId;
        token.teacherProfileId = u.teacherProfileId;
        token.parentProfileId = u.parentProfileId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as SessionUser["role"];
        session.user.avatar = token.avatar as string | null | undefined;
        session.user.studentProfileId = token.studentProfileId as string | undefined;
        session.user.teacherProfileId = token.teacherProfileId as string | undefined;
        session.user.parentProfileId = token.parentProfileId as string | undefined;
      }
      return session;
    },
  },
});
