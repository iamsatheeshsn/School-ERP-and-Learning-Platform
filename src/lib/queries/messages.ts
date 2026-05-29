import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac/guards";
import type { SessionUser } from "@/lib/types";

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
