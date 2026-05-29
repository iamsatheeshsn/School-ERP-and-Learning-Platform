import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac/permissions";
import type { SessionUser } from "@/lib/types";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) throw new ForbiddenError();
  return user;
}

export function assertRole(user: SessionUser, ...roles: Role[]): void {
  if (!roles.includes(user.role)) throw new ForbiddenError();
}
