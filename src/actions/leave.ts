"use server";

import { LeaveStatus, LeaveType, NotificationType, Role } from "@/lib/types/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const createLeaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  type: z.nativeEnum(LeaveType),
  reason: z.string().min(3),
});

const reviewLeaveSchema = z.object({
  leaveId: z.string(),
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  reviewNote: z.string().optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateLeavePaths() {
  revalidatePath("/teacher/leave");
  revalidatePath("/admin/leave");
}

export async function createLeaveRequest(
  input: z.infer<typeof createLeaveSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("leave:write");
    if (user.role !== Role.TEACHER || !user.teacherProfileId) {
      throw new ForbiddenError();
    }

    const parsed = createLeaveSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const startDate = new Date(parsed.data.startDate);
    const endDate = new Date(parsed.data.endDate);
    if (endDate < startDate) return fail("End date must be after start date");

    const leave = await db.leaveRequest.create({
      data: {
        teacherId: user.teacherProfileId,
        startDate,
        endDate,
        type: parsed.data.type,
        reason: parsed.data.reason,
        status: LeaveStatus.PENDING,
      },
    });

    const admins = await db.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.LEAVE,
          title: "Leave request pending",
          body: `${user.name} requested ${parsed.data.type.replace(/_/g, " ").toLowerCase()} leave.`,
        })),
      });
    }

    revalidateLeavePaths();
    return ok({ id: leave.id as string });
  } catch (error) {
    return handleError(error);
  }
}

export async function getMyLeaveRequests(): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("leave:read");
    if (user.role !== Role.TEACHER || !user.teacherProfileId) {
      throw new ForbiddenError();
    }

    const requests = await db.leaveRequest.findMany({
      where: { teacherId: user.teacherProfileId },
      orderBy: [{ createdAt: "desc" }],
    });

    return ok(requests);
  } catch (error) {
    return handleError(error);
  }
}

export async function getLeaveRequestsAdmin(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("leave:manage");

    const requests = await db.leaveRequest.findMany({
      include: {
        teacher: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return ok(requests);
  } catch (error) {
    return handleError(error);
  }
}

export async function reviewLeaveRequest(
  input: z.infer<typeof reviewLeaveSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("leave:manage");
    const parsed = reviewLeaveSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const leave = await db.leaveRequest.findUnique({
      where: { id: parsed.data.leaveId },
      include: {
        teacher: { include: { user: { select: { id: true } } } },
      },
    });
    if (!leave) return fail("Leave request not found");
    if (leave.status !== LeaveStatus.PENDING) return fail("Already reviewed");

    await db.leaveRequest.update({
      where: { id: parsed.data.leaveId },
      data: {
        status: parsed.data.status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote ?? null,
      },
    });

    await db.notification.create({
      data: {
        userId: (leave.teacher.user as { id: string }).id,
        type: NotificationType.LEAVE,
        title: `Leave ${parsed.data.status.toLowerCase()}`,
        body:
          parsed.data.reviewNote ??
          `Your leave request was ${parsed.data.status.toLowerCase()}.`,
      },
    });

    revalidateLeavePaths();
    return ok({ id: parsed.data.leaveId });
  } catch (error) {
    return handleError(error);
  }
}
