import { Role } from "@prisma/client";

export const PERMISSIONS = {
  "students:read": [Role.ADMIN, Role.TEACHER],
  "students:write": [Role.ADMIN],
  "classes:read": [Role.ADMIN, Role.TEACHER],
  "classes:write": [Role.ADMIN],
  "homework:read": [Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT],
  "homework:write": [Role.ADMIN, Role.TEACHER],
  "homework:submit": [Role.STUDENT],
  "attendance:read": [Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT],
  "attendance:write": [Role.ADMIN, Role.TEACHER],
  "grades:read": [Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT],
  "grades:write": [Role.ADMIN, Role.TEACHER],
  "fees:read": [Role.ADMIN, Role.PARENT],
  "fees:write": [Role.ADMIN],
  "messages:read": [Role.ADMIN, Role.TEACHER, Role.PARENT],
  "messages:write": [Role.ADMIN, Role.TEACHER, Role.PARENT],
  "broadcasts:write": [Role.ADMIN, Role.TEACHER],
  "analytics:read": [Role.ADMIN, Role.TEACHER],
  "report-cards:read": [Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT],
  "report-cards:write": [Role.ADMIN, Role.TEACHER],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function getRoleRoutePrefix(role: Role): string {
  return `/${role.toLowerCase()}`;
}

export const PUBLIC_ROUTES = ["/", "/login", "/register"];
export const AUTH_ROUTES = ["/login", "/register"];

export const ROLE_ROUTES: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  PARENT: "/parent",
  STUDENT: "/student",
};
