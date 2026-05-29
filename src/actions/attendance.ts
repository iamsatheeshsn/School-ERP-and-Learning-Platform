"use server";

import { AttendanceStatus, NotificationType, Role } from "@prisma/client";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendAbsenceAlert } from "@/lib/email/resend";
import {
  checkAttendanceThresholdFlags,
  type AttendanceThresholdFlags,
} from "@/lib/queries/attendance";
import {
  assertCanAccessStudent,
  assertTeacherCanAccessClass,
  getAccessibleStudentIds,
} from "@/lib/queries/students";
import { AuthError, ForbiddenError, requireAuth, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const markAttendanceSchema = z.object({
  classId: z.string(),
  date: z.string(),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.nativeEnum(AttendanceStatus),
      notes: z.string().optional(),
    })
  ),
});

const classDateSchema = z.object({
  classId: z.string(),
  date: z.string(),
});

const studentRangeSchema = z.object({
  studentId: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

function revalidateAttendancePaths() {
  revalidatePath("/teacher/attendance");
  revalidatePath("/parent/attendance");
  revalidatePath("/student/attendance");
  revalidatePath("/admin/analytics");
}

async function notifyParentsOfAbsence(studentId: string, date: Date) {
  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      parents: {
        include: {
          parent: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      },
    },
  });
  if (!student) return;

  const dateLabel = format(date, "dd MMM yyyy");

  for (const link of student.parents) {
    const parentUser = link.parent.user;
    await sendAbsenceAlert(parentUser.email, parentUser.name, student.user.name, dateLabel);
    await db.notification.create({
      data: {
        userId: parentUser.id,
        type: NotificationType.ATTENDANCE_ALERT,
        title: `Absence Alert: ${student.user.name}`,
        body: `${student.user.name} was marked absent on ${dateLabel}.`,
        payload: { studentId, date: date.toISOString() },
      },
    });
  }
}

export async function markAttendance(
  input: z.infer<typeof markAttendanceSchema>
): Promise<ActionResult<{ marked: number; flags: AttendanceThresholdFlags[] }>> {
  try {
    const user = await requirePermission("attendance:write");
    const parsed = markAttendanceSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertTeacherCanAccessClass(user, parsed.data.classId);

    const date = parseDate(parsed.data.date);
    const classStudents = await db.studentProfile.findMany({
      where: { classId: parsed.data.classId },
      select: { id: true },
    });
    const classStudentIds = new Set(classStudents.map((s) => s.id));

    for (const record of parsed.data.records) {
      if (!classStudentIds.has(record.studentId)) {
        return fail("Student not in this class");
      }
    }

    let marked = 0;
    const absentStudentIds: string[] = [];

    for (const record of parsed.data.records) {
      await db.attendance.upsert({
        where: {
          studentId_date: { studentId: record.studentId, date },
        },
        create: {
          studentId: record.studentId,
          classId: parsed.data.classId,
          date,
          status: record.status,
          notes: record.notes,
          markedBy: user.id,
        },
        update: {
          status: record.status,
          notes: record.notes,
          markedBy: user.id,
        },
      });
      marked++;

      if (record.status === AttendanceStatus.ABSENT) {
        absentStudentIds.push(record.studentId);
      }
    }

    await Promise.all(absentStudentIds.map((id) => notifyParentsOfAbsence(id, date)));

    const flags = await Promise.all(
      parsed.data.records.map((r) => checkAttendanceThresholdFlags(r.studentId))
    );

    revalidateAttendancePaths();
    return ok({ marked, flags });
  } catch (error) {
    return handleError(error);
  }
}

export async function getAttendanceByClassAndDate(
  input: z.infer<typeof classDateSchema>
): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("attendance:read");
    const parsed = classDateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, parsed.data.classId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const date = parseDate(parsed.data.date);
    const records = await db.attendance.findMany({
      where: { classId: parsed.data.classId, date },
      include: {
        student: {
          include: { user: { select: { id: true, name: true } } },
        },
        marker: { select: { id: true, name: true } },
      },
      orderBy: { student: { rollNo: "asc" } },
    });

    return ok(records);
  } catch (error) {
    return handleError(error);
  }
}

export async function getStudentAttendance(
  input: z.infer<typeof studentRangeSchema>
): Promise<ActionResult<{ records: unknown[]; flags: AttendanceThresholdFlags }>> {
  try {
    const user = await requirePermission("attendance:read");
    const parsed = studentRangeSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    let studentId = parsed.data.studentId;
    if (user.role === Role.STUDENT) {
      if (!user.studentProfileId) return fail("Student profile not found");
      studentId = user.studentProfileId;
    }

    await assertCanAccessStudent(user, studentId);

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (parsed.data.from) dateFilter.gte = parseDate(parsed.data.from);
    if (parsed.data.to) dateFilter.lte = parseDate(parsed.data.to);

    const records = await db.attendance.findMany({
      where: {
        studentId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: { date: "desc" },
    });

    const flags = await checkAttendanceThresholdFlags(studentId);
    return ok({ records, flags });
  } catch (error) {
    return handleError(error);
  }
}

export async function getAttendanceSummary(
  classId: string,
  date: string
): Promise<
  ActionResult<{
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
    thresholdFlags: AttendanceThresholdFlags[];
  }>
> {
  try {
    const user = await requirePermission("attendance:read");
    if (!classId || !date) return fail("Class ID and date required");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, classId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const parsedDate = parseDate(date);
    const records = await db.attendance.findMany({
      where: { classId, date: parsedDate },
      select: { status: true, studentId: true },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const late = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excused = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    const studentIds = [...new Set(records.map((r) => r.studentId))];
    const thresholdFlags = await Promise.all(
      studentIds.map((id: string) => checkAttendanceThresholdFlags(id))
    );

    return ok({
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate,
      thresholdFlags: thresholdFlags.filter((f) => f.flagged),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getParentChildrenAttendanceSummary(): Promise<
  ActionResult<{ studentId: string; flags: AttendanceThresholdFlags }[]>
> {
  try {
    const user = await requireAuth();
    if (user.role !== Role.PARENT || !user.parentProfileId) {
      throw new ForbiddenError();
    }

    const allowedIds = await getAccessibleStudentIds(user);
    if (!allowedIds || allowedIds.length === 0) return ok([]);

    const summaries = await Promise.all(
      allowedIds.map(async (studentId) => ({
        studentId,
        flags: await checkAttendanceThresholdFlags(studentId),
      }))
    );

    return ok(summaries);
  } catch (error) {
    return handleError(error);
  }
}
