import { Role } from "@prisma/client";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { success: false, error };
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  studentProfileId?: string;
  teacherProfileId?: string;
  parentProfileId?: string;
};

export const ROLE_DASHBOARD: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  PARENT: "/parent/dashboard",
  STUDENT: "/student/dashboard",
};

export type AttachmentMeta = {
  url: string;
  name: string;
  size?: number;
  type?: string;
};

export type AiHomeworkFeedback = {
  strengths: string[];
  improvements: string[];
  conceptualGaps: string[];
  suggestedGrade: number;
  summary: string;
};

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};
