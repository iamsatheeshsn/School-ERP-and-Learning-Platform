import { ROLE_DASHBOARD } from "@/lib/types";
import { PUBLIC_ROUTES, ROLE_ROUTES } from "@/lib/rbac/permissions";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/constants";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@/lib/types/enums";

function decodeSessionPayload(cookie: string): {
  role?: Role;
  uid?: string;
} | null {
  try {
    const parts = cookie.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as Record<string, unknown>;
    const exp = payload.exp as number | undefined;
    if (exp && exp * 1000 < Date.now()) return null;

    return {
      role: payload.role as Role | undefined,
      uid: (payload.user_id as string) ?? (payload.sub as string),
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const decoded = sessionCookie ? decodeSessionPayload(sessionCookie) : null;
  const isLoggedIn = !!decoded?.uid;
  const role = decoded?.role;

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/storage") ||
    pathname.startsWith("/api/payments/webhook");

  if (isPublic) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role) {
    const allowedPrefix = ROLE_ROUTES[role];
    const isRoleRoute = Object.values(ROLE_ROUTES).some((p) => pathname.startsWith(p));
    if (isRoleRoute && !pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD[role], req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
