import { NextResponse } from "next/server";
import {
  buildSessionUser,
  createSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const sessionCookie = await createSessionCookie(idToken);
    await setSessionCookie(sessionCookie);

    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const user = await buildSessionUser(decoded.uid);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function GET() {
  const { auth } = await import("@/lib/auth/server");
  const session = await auth();
  return NextResponse.json(session);
}
