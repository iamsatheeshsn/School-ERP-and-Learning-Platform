import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatar?: string | null;
      studentProfileId?: string;
      teacherProfileId?: string;
      parentProfileId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    avatar?: string | null;
    studentProfileId?: string;
    teacherProfileId?: string;
    parentProfileId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    avatar?: string | null;
    studentProfileId?: string;
    teacherProfileId?: string;
    parentProfileId?: string;
  }
}

export {};
