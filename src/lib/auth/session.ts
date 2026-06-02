import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "@/lib/firebase/constants";
import { db } from "@/lib/db";
import type { Role } from "@/lib/types/enums";
import type { SessionUser } from "@/lib/types";

export type SessionClaims = {
  role?: Role;
  studentProfileId?: string;
  teacherProfileId?: string;
  parentProfileId?: string;
};

export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

export async function verifySessionCookie(
  sessionCookie: string
): Promise<(SessionClaims & { uid: string; email?: string; name?: string }) | null> {
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role as Role | undefined,
      studentProfileId: decoded.studentProfileId as string | undefined,
      teacherProfileId: decoded.teacherProfileId as string | undefined,
      parentProfileId: decoded.parentProfileId as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function setCustomClaimsForUser(
  uid: string,
  claims: SessionClaims
): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, claims);
}

export async function buildSessionUser(uid: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { id: uid },
    include: {
      studentProfile: true,
      teacherProfile: true,
      parentProfile: true,
    },
  });
  if (!user) return null;

  const claims: SessionClaims = {
    role: user.role as Role,
    studentProfileId: (user.studentProfile as { id?: string } | null)?.id,
    teacherProfileId: (user.teacherProfile as { id?: string } | null)?.id,
    parentProfileId: (user.parentProfile as { id?: string } | null)?.id,
  };
  await setCustomClaimsForUser(uid, claims);

  return {
    id: uid,
    email: user.email as string,
    name: user.name as string,
    role: user.role as Role,
    avatar: user.avatar as string | null | undefined,
    ...claims,
  };
}

export async function getSessionCookieFromStore(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function setSessionCookie(value: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function revokeSession(sessionCookie: string): Promise<void> {
  const decoded = await verifySessionCookie(sessionCookie);
  if (decoded?.uid) {
    await getAdminAuth().revokeRefreshTokens(decoded.uid);
  }
}
