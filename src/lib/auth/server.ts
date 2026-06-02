import { cache } from "react";
import {
  buildSessionUser,
  getSessionCookieFromStore,
  verifySessionCookie,
} from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types";

export const auth = cache(async (): Promise<{ user: SessionUser } | null> => {
  const sessionCookie = await getSessionCookieFromStore();
  if (!sessionCookie) return null;

  const decoded = await verifySessionCookie(sessionCookie);
  if (!decoded?.uid) return null;

  if (decoded.role && decoded.email) {
    return {
      user: {
        id: decoded.uid,
        email: decoded.email,
        name: decoded.name ?? decoded.email,
        role: decoded.role,
        studentProfileId: decoded.studentProfileId,
        teacherProfileId: decoded.teacherProfileId,
        parentProfileId: decoded.parentProfileId,
      },
    };
  }

  const user = await buildSessionUser(decoded.uid);
  if (!user) return null;
  return { user };
});

export async function signOut(): Promise<void> {
  const { clearSessionCookie, getSessionCookieFromStore, revokeSession } = await import(
    "@/lib/auth/session"
  );
  const cookie = await getSessionCookieFromStore();
  if (cookie) await revokeSession(cookie);
  await clearSessionCookie();
}
