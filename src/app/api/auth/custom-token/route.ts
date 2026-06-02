import { NextResponse } from "next/server";
import {
  getSessionCookieFromStore,
  verifySessionCookie,
} from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const sessionCookie = await getSessionCookieFromStore();
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customToken = await getAdminAuth().createCustomToken(decoded.uid);
    return NextResponse.json({ customToken });
  } catch (error) {
    console.error("Custom token creation failed:", error);
    return NextResponse.json(
      { error: "Could not restore client authentication." },
      { status: 500 }
    );
  }
}
