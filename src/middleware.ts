import { auth } from "@/lib/auth";
import { AUTH_ROUTES, PUBLIC_ROUTES, ROLE_ROUTES } from "@/lib/rbac/permissions";
import { ROLE_DASHBOARD } from "@/lib/types";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/uploadthing") ||
    pathname.startsWith("/api/payments/webhook");

  if (isPublic) {
    if (isLoggedIn && AUTH_ROUTES.includes(pathname) && role) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD[role], req.url));
    }
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
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
