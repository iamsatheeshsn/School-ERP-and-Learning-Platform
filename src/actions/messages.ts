"use server";

import { NotificationType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { draftParentUpdate } from "@/lib/ai/services";
import { sendBroadcast as sendBroadcastEmail } from "@/lib/email/resend";
import { assertThreadAccess } from "@/lib/queries/messages";
import { assertCanAccessStudent } from "@/lib/queries/students";
import { publishThreadEvent } from "@/lib/realtime/sse-hub";
import { AuthError, ForbiddenError, requireAuth, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult, type AttachmentMeta } from "@/lib/types";

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
});

const sendMessageSchema = z.object({
  threadId: z.string(),
  body: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
});

const createThreadSchema = z.object({
  studentId: z.string(),
  teacherId: z.string(),
  parentId: z.string(),
  subject: z.string().min(1),
});

const draftAiSchema = z.object({
  studentId: z.string(),
  attendanceSummary: z.string(),
  homeworkSummary: z.string(),
  gradesSummary: z.string(),
});

const broadcastSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  scope: z.enum(["school", "class"]),
  scopeId: z.string().optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateMessagePaths() {
  revalidatePath("/teacher/messages");
  revalidatePath("/parent/messages");
  revalidatePath("/admin/messages");
}

export async function getThreads(): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("messages:read");

    let where = {};
    if (user.role === Role.TEACHER && user.teacherProfileId) {
      where = { teacherId: user.teacherProfileId };
    } else if (user.role === Role.PARENT && user.parentProfileId) {
      where = { parentId: user.parentProfileId };
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const threads = await db.messageThread.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { id: true, name: true } } },
        },
        teacher: { include: { user: { select: { id: true, name: true } } } },
        parent: { include: { user: { select: { id: true, name: true } } } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
            createdAt: true,
            readAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unreadGroups = await db.message.groupBy({
      by: ["threadId"],
      where: { receiverId: user.id, readAt: null },
      _count: { _all: true },
    });
    const unreadByThread = Object.fromEntries(
      unreadGroups.map((g) => [g.threadId, g._count._all])
    );

    const withUnread = threads.map((thread) => ({
      ...thread,
      unreadCount: unreadByThread[thread.id] ?? 0,
    }));

    return ok(withUnread);
  } catch (error) {
    return handleError(error);
  }
}

export async function getMessages(threadId: string): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("messages:read");
    if (!threadId) return fail("Thread ID required");

    await assertThreadAccess(user, threadId);

    const messages = await db.message.findMany({
      where: { threadId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(messages);
  } catch (error) {
    return handleError(error);
  }
}

export async function sendMessage(
  input: z.infer<typeof sendMessageSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("messages:write");
    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const thread = await assertThreadAccess(user, parsed.data.threadId);

    const receiverId =
      user.role === Role.TEACHER
        ? thread.parent.userId
        : user.role === Role.PARENT
          ? thread.teacher.userId
          : user.role === Role.ADMIN
            ? thread.parent.userId
            : null;

    if (!receiverId) throw new ForbiddenError();

    const message = await db.message.create({
      data: {
        threadId: parsed.data.threadId,
        senderId: user.id,
        receiverId,
        body: parsed.data.body,
        attachments: (parsed.data.attachments ?? []) as AttachmentMeta[],
      },
    });

    await db.messageThread.update({
      where: { id: parsed.data.threadId },
      data: { updatedAt: new Date() },
    });

    await db.notification.create({
      data: {
        userId: receiverId,
        type: NotificationType.MESSAGE,
        title: "New message",
        body: parsed.data.body.slice(0, 120),
        payload: { threadId: parsed.data.threadId, messageId: message.id },
      },
    });

    const full = await db.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    if (full) {
      publishThreadEvent(parsed.data.threadId, {
        type: "message.new",
        threadId: parsed.data.threadId,
        message: {
          id: full.id,
          body: full.body,
          createdAt: full.createdAt.toISOString(),
          sender: full.sender,
          attachments: (full.attachments as AttachmentMeta[]) ?? [],
        },
      });
      publishThreadEvent(parsed.data.threadId, {
        type: "thread.updated",
        threadId: parsed.data.threadId,
      });
    }

    revalidateMessagePaths();
    return ok({ id: message.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function markThreadRead(
  threadId: string
): Promise<ActionResult<{ marked: number }>> {
  try {
    const user = await requirePermission("messages:read");
    if (!threadId) return fail("Thread ID required");

    await assertThreadAccess(user, threadId);

    const result = await db.message.updateMany({
      where: { threadId, receiverId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        type: NotificationType.MESSAGE,
        readAt: null,
      },
      select: { id: true, payload: true },
    });

    const relatedIds = notifications
      .filter((n) => {
        const payload = n.payload as { threadId?: string };
        return payload.threadId === threadId;
      })
      .map((n) => n.id);

    if (relatedIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: relatedIds } },
        data: { readAt: new Date() },
      });
    }

    revalidateMessagePaths();
    revalidatePath("/parent/dashboard");
    revalidatePath("/teacher/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/student/dashboard");
    return ok({ marked: result.count });
  } catch (error) {
    return handleError(error);
  }
}

export async function markRead(messageId: string): Promise<ActionResult<void>> {
  try {
    const user = await requirePermission("messages:read");
    if (!messageId) return fail("Message ID required");

    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { receiverId: true, threadId: true, readAt: true },
    });
    if (!message) return fail("Message not found");
    if (message.receiverId !== user.id) throw new ForbiddenError();

    if (!message.readAt) {
      await db.message.update({
        where: { id: messageId },
        data: { readAt: new Date() },
      });
    }

    revalidateMessagePaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function createThread(
  input: z.infer<typeof createThreadSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("messages:write");
    const parsed = createThreadSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertCanAccessStudent(user, parsed.data.studentId);

    const thread = await db.messageThread.upsert({
      where: {
        studentId_teacherId_parentId: {
          studentId: parsed.data.studentId,
          teacherId: parsed.data.teacherId,
          parentId: parsed.data.parentId,
        },
      },
      create: parsed.data,
      update: { subject: parsed.data.subject },
    });

    revalidateMessagePaths();
    return ok({ id: thread.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function draftMessageWithAI(
  input: z.infer<typeof draftAiSchema>
): Promise<ActionResult<{ draft: string }>> {
  try {
    const user = await requirePermission("messages:write");
    const parsed = draftAiSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertCanAccessStudent(user, parsed.data.studentId);

    const student = await db.studentProfile.findUnique({
      where: { id: parsed.data.studentId },
      include: { user: { select: { name: true } } },
    });
    if (!student) return fail("Student not found");

    const draft = await draftParentUpdate(user.id, {
      studentName: student.user.name,
      attendanceSummary: parsed.data.attendanceSummary,
      homeworkSummary: parsed.data.homeworkSummary,
      gradesSummary: parsed.data.gradesSummary,
    });

    return ok({ draft });
  } catch (error) {
    return handleError(error);
  }
}

export async function sendBroadcast(
  input: z.infer<typeof broadcastSchema>
): Promise<ActionResult<{ id: string; recipients: number }>> {
  try {
    const user = await requirePermission("broadcasts:write");
    const parsed = broadcastSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (parsed.data.scope === "class" && !parsed.data.scopeId) {
      return fail("Class ID required for class broadcast");
    }

    const broadcast = await db.broadcast.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        scope: parsed.data.scope,
        scopeId: parsed.data.scopeId ?? null,
        createdBy: user.id,
      },
    });

    let recipientUsers: { id: string; email: string }[] = [];

    if (parsed.data.scope === "school") {
      recipientUsers = await db.user.findMany({
        where: { role: { in: [Role.PARENT, Role.STUDENT, Role.TEACHER] } },
        select: { id: true, email: true },
      });
    } else if (parsed.data.scopeId) {
      const students = await db.studentProfile.findMany({
        where: { classId: parsed.data.scopeId },
        include: {
          user: { select: { id: true, email: true } },
          parents: {
            include: { parent: { include: { user: { select: { id: true, email: true } } } } },
          },
        },
      });
      const seen = new Set<string>();
      for (const st of students) {
        if (!seen.has(st.user.id)) {
          recipientUsers.push(st.user);
          seen.add(st.user.id);
        }
        for (const link of st.parents) {
          const parentUser = link.parent.user;
          if (!seen.has(parentUser.id)) {
            recipientUsers.push(parentUser);
            seen.add(parentUser.id);
          }
        }
      }
    }

    await sendBroadcastEmail(
      recipientUsers.map((u) => u.email),
      parsed.data.title,
      parsed.data.body
    );

    await db.notification.createMany({
      data: recipientUsers.map((u) => ({
        userId: u.id,
        type: NotificationType.BROADCAST,
        title: parsed.data.title,
        body: parsed.data.body.slice(0, 200),
        payload: { broadcastId: broadcast.id },
      })),
    });

    revalidateMessagePaths();
    return ok({ id: broadcast.id, recipients: recipientUsers.length });
  } catch (error) {
    return handleError(error);
  }
}
