import { Role } from "@/lib/types/enums";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac/guards";
import type { SessionUser } from "@/lib/types";
import { getParentChildren } from "@/lib/queries/students";

export type ParentMessageContact = {
  studentId: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
};

export async function getParentMessageContacts(
  parentProfileId: string
): Promise<ParentMessageContact[]> {
  const children = await getParentChildren(parentProfileId);
  const contacts: ParentMessageContact[] = [];
  const seen = new Set<string>();

  for (const child of children) {
    const teacherLinks = await db.teacherClass.findMany({
      where: { classId: child.classId },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    for (const link of teacherLinks) {
      const key = `${child.id}:${link.teacherId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      contacts.push({
        studentId: child.id,
        studentName: child.user.name,
        className: child.class.name,
        teacherId: link.teacherId,
        teacherName: link.teacher.user.name,
      });
    }
  }

  return contacts.sort((a, b) =>
    `${a.studentName}${a.teacherName}`.localeCompare(
      `${b.studentName}${b.teacherName}`
    )
  );
}

export async function assertThreadAccess(user: SessionUser, threadId: string) {
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      teacher: { select: { userId: true } },
      parent: { select: { userId: true } },
    },
  });
  if (!thread) throw new Error("Thread not found");

  if (user.role === Role.ADMIN) return thread;

  if (user.role === Role.TEACHER && thread.teacher.userId === user.id) return thread;
  if (user.role === Role.PARENT && thread.parent.userId === user.id) return thread;

  throw new ForbiddenError();
}
