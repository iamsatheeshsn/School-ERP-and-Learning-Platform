"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const periodSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().optional(),
});

const updatePeriodSchema = periodSchema.extend({ id: z.string() });

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateTimetablePaths() {
  revalidatePath("/admin/timetable");
  revalidatePath("/teacher/timetable");
}

export async function createTimetablePeriod(
  input: z.infer<typeof periodSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = periodSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const period = await db.timetablePeriod.create({ data: parsed.data });

    await writeAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: "CREATE",
      entity: "TimetablePeriod",
      entityId: period.id,
      summary: `Added timetable period (${parsed.data.startTime}-${parsed.data.endTime})`,
    });

    revalidateTimetablePaths();
    return ok({ id: period.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateTimetablePeriod(
  input: z.infer<typeof updatePeriodSchema>
): Promise<ActionResult<void>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = updatePeriodSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const { id, ...data } = parsed.data;
    await db.timetablePeriod.update({ where: { id }, data });

    await writeAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: "UPDATE",
      entity: "TimetablePeriod",
      entityId: id,
      summary: "Updated timetable period",
    });

    revalidateTimetablePaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteTimetablePeriod(input: {
  id: string;
}): Promise<ActionResult<void>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    await db.timetablePeriod.delete({ where: { id: input.id } });

    await writeAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: "DELETE",
      entity: "TimetablePeriod",
      entityId: input.id,
      summary: "Deleted timetable period",
    });

    revalidateTimetablePaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function getTimetableForClass(classId: string) {
  return db.timetablePeriod.findMany({
    where: { classId },
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function getTimetableForTeacher(teacherProfileId: string) {
  return db.timetablePeriod.findMany({
    where: { teacherId: teacherProfileId },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true, code: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}
