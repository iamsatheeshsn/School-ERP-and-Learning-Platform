import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac/guards";
import type { SessionUser } from "@/lib/types";

const studentInclude = {
  user: { select: { id: true, name: true, email: true, avatar: true } },
  class: { select: { id: true, name: true, grade: true, section: true } },
} as const;

export async function getTeacherClassIds(teacherProfileId: string): Promise<string[]> {
  const links = await db.teacherClass.findMany({
    where: { teacherId: teacherProfileId },
    select: { classId: true },
  });
  return links.map((l) => l.classId);
}

export async function getTeacherStudents(teacherProfileId: string) {
  const classIds = await getTeacherClassIds(teacherProfileId);
  if (classIds.length === 0) return [];

  return db.studentProfile.findMany({
    where: { classId: { in: classIds } },
    include: studentInclude,
    orderBy: [{ classId: "asc" }, { rollNo: "asc" }],
  });
}

export async function getParentChildren(parentProfileId: string) {
  const links = await db.parentStudent.findMany({
    where: { parentId: parentProfileId },
    include: { student: { include: studentInclude } },
  });
  return links.map((l) => l.student);
}

export async function getStudentById(studentId: string) {
  return db.studentProfile.findUnique({
    where: { id: studentId },
    include: studentInclude,
  });
}

export async function isTeacherOfClass(
  teacherProfileId: string,
  classId: string
): Promise<boolean> {
  const link = await db.teacherClass.findUnique({
    where: { teacherId_classId: { teacherId: teacherProfileId, classId } },
  });
  return Boolean(link);
}

export async function isTeacherOfStudent(
  teacherProfileId: string,
  studentId: string
): Promise<boolean> {
  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student) return false;
  return isTeacherOfClass(teacherProfileId, student.classId);
}

export async function isParentOfStudent(
  parentProfileId: string,
  studentId: string
): Promise<boolean> {
  const link = await db.parentStudent.findUnique({
    where: { parentId_studentId: { parentId: parentProfileId, studentId } },
  });
  return Boolean(link);
}

export async function assertTeacherCanAccessClass(
  user: SessionUser,
  classId: string
): Promise<void> {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.TEACHER || !user.teacherProfileId) {
    throw new ForbiddenError();
  }
  if (!(await isTeacherOfClass(user.teacherProfileId, classId))) {
    throw new ForbiddenError();
  }
}

export async function assertCanAccessStudent(
  user: SessionUser,
  studentId: string
): Promise<void> {
  if (user.role === Role.ADMIN) return;

  if (user.role === Role.STUDENT) {
    if (user.studentProfileId !== studentId) throw new ForbiddenError();
    return;
  }

  if (user.role === Role.PARENT) {
    if (!user.parentProfileId || !(await isParentOfStudent(user.parentProfileId, studentId))) {
      throw new ForbiddenError();
    }
    return;
  }

  if (user.role === Role.TEACHER) {
    if (!user.teacherProfileId || !(await isTeacherOfStudent(user.teacherProfileId, studentId))) {
      throw new ForbiddenError();
    }
    return;
  }

  throw new ForbiddenError();
}

/** Returns null for admin (unrestricted), otherwise scoped student IDs. */
export async function getAccessibleStudentIds(user: SessionUser): Promise<string[] | null> {
  if (user.role === Role.ADMIN) return null;

  if (user.role === Role.STUDENT && user.studentProfileId) {
    return [user.studentProfileId];
  }

  if (user.role === Role.PARENT && user.parentProfileId) {
    const children = await getParentChildren(user.parentProfileId);
    return children.map((c) => c.id);
  }

  if (user.role === Role.TEACHER && user.teacherProfileId) {
    const students = await getTeacherStudents(user.teacherProfileId);
    return students.map((s) => s.id);
  }

  return [];
}

export async function filterAccessibleStudents(user: SessionUser, studentIds: string[]) {
  const allowed = await getAccessibleStudentIds(user);
  if (allowed === null) return studentIds;
  const allowedSet = new Set(allowed);
  return studentIds.filter((id) => allowedSet.has(id));
}
