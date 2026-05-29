"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireAuth } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const markReadSchema = z.object({
  notificationId: z.string(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

export async function getNotifications(limit = 50): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requireAuth();

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    return ok(notifications);
  } catch (error) {
    return handleError(error);
  }
}

export async function markNotificationRead(
  input: z.infer<typeof markReadSchema>
): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    const parsed = markReadSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const notification = await db.notification.findUnique({
      where: { id: parsed.data.notificationId },
      select: { userId: true, readAt: true },
    });
    if (!notification) return fail("Notification not found");
    if (notification.userId !== user.id) throw new ForbiddenError();

    if (!notification.readAt) {
      await db.notification.update({
        where: { id: parsed.data.notificationId },
        data: { readAt: new Date() },
      });
    }

    revalidatePath("/parent/dashboard");
    revalidatePath("/teacher/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/student/dashboard");
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function getUnreadCount(): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireAuth();

    const count = await db.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return ok({ count });
  } catch (error) {
    return handleError(error);
  }
}
