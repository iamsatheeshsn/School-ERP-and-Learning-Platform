import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionCookieFromStore,
  revokeSession,
} from "@/lib/auth/session";

export async function POST() {
  const cookie = await getSessionCookieFromStore();
  if (cookie) {
    await revokeSession(cookie);
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
