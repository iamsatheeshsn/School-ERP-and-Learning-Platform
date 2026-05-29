"use server";

import { ExamType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  assertTeacherCanAccessClass,
  getTeacherClassIds,
  getTeacherStudents,
} from "@/lib/queries/students";
import { AuthError, ForbiddenError, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const upsertGradeSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  term: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(1).optional(),
  examType: z.nativeEnum(ExamType).optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

export async function getClassGrades(
  classId: string,
  term?: string
): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("grades:read");
    if (!classId) return fail("Class ID required");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, classId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const grades = await db.grade.findMany({
      where: {
        student: { classId },
        ...(term ? { term } : {}),
      },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ student: { rollNo: "asc" } }, { subject: { name: "asc" } }],
    });

    return ok(grades);
  } catch (error) {
    return handleError(error);
  }
}

export async function upsertGrade(
  input: z.infer<typeof upsertGradeSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("grades:write");
    const parsed = upsertGradeSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const student = await db.studentProfile.findUnique({
      where: { id: parsed.data.studentId },
      select: { classId: true },
    });
    if (!student) return fail("Student not found");

    await assertTeacherCanAccessClass(user, student.classId);

    const existing = await db.grade.findFirst({
      where: {
        studentId: parsed.data.studentId,
        subjectId: parsed.data.subjectId,
        term: parsed.data.term,
      },
    });

    const grade = existing
      ? await db.grade.update({
          where: { id: existing.id },
          data: {
            score: parsed.data.score,
            maxScore: parsed.data.maxScore ?? existing.maxScore,
            examType: parsed.data.examType ?? existing.examType,
          },
        })
      : await db.grade.create({
          data: {
            studentId: parsed.data.studentId,
            subjectId: parsed.data.subjectId,
            term: parsed.data.term,
            score: parsed.data.score,
            maxScore: parsed.data.maxScore ?? 100,
            examType: parsed.data.examType ?? ExamType.UNIT_TEST,
          },
        });

    revalidatePath("/teacher/grades");
    revalidatePath("/student/grades");
    return ok({ id: grade.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function getTeacherGradeContext(): Promise<
  ActionResult<{
    classes: { id: string; name: string }[];
    subjects: { id: string; name: string; code: string }[];
    students: { id: string; rollNo: string; name: string; classId: string }[];
  }>
> {
  try {
    const user = await requirePermission("grades:write");
    if (user.role !== Role.TEACHER || !user.teacherProfileId) {
      throw new ForbiddenError();
    }

    const classIds = await getTeacherClassIds(user.teacherProfileId);
    const [classes, subjects, students] = await Promise.all([
      db.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.teacherSubject.findMany({
        where: { teacherId: user.teacherProfileId },
        include: { subject: { select: { id: true, name: true, code: true } } },
      }),
      getTeacherStudents(user.teacherProfileId),
    ]);

    return ok({
      classes,
      subjects: subjects.map((s) => s.subject),
      students: students.map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.user.name,
        classId: s.classId,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
