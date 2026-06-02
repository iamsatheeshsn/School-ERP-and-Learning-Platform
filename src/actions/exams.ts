"use server";

import { ExamStatus, ExamType, NotificationType, Role } from "@/lib/types/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { computePercentage, computeRanks, scoreToGradeLetter } from "@/lib/exams/helpers";
import {
  assertCanAccessStudent,
  assertTeacherCanAccessClass,
  getTeacherClassIds,
} from "@/lib/queries/students";
import { AuthError, ForbiddenError, requirePermission, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const createExamSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(ExamType),
  classId: z.string(),
  subjectId: z.string(),
  term: z.string().min(1),
  examDate: z.string(),
  maxMarks: z.number().min(1).max(1000).optional(),
  showRanks: z.boolean().optional(),
});

const saveExamResultsSchema = z.object({
  examId: z.string(),
  results: z.array(
    z.object({
      studentId: z.string(),
      marks: z.number().min(0),
    })
  ),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

async function assertCanManageExam(examId: string) {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: { id: true, classId: true, subjectId: true, status: true, maxMarks: true },
  });
  if (!exam) throw new Error("Exam not found");
  return exam;
}

async function assertTeacherCanEnterMarks(
  user: Awaited<ReturnType<typeof requirePermission>>,
  exam: { classId: string; subjectId: string; status: string }
) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.TEACHER || !user.teacherProfileId) {
    throw new ForbiddenError();
  }
  await assertTeacherCanAccessClass(user, exam.classId);

  const teachesSubject = await db.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId: user.teacherProfileId,
        subjectId: exam.subjectId,
      },
    },
  });
  if (!teachesSubject) {
    throw new ForbiddenError("You are not assigned to this subject");
  }
}

export async function createExam(
  input: z.infer<typeof createExamSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("exams:manage");
    const parsed = createExamSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const exam = await db.exam.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        classId: parsed.data.classId,
        subjectId: parsed.data.subjectId,
        term: parsed.data.term,
        examDate: new Date(parsed.data.examDate),
        maxMarks: parsed.data.maxMarks ?? 100,
        showRanks: parsed.data.showRanks ?? true,
        status: ExamStatus.SCHEDULED,
        createdBy: user.id,
      },
    });

    revalidatePath("/admin/exams");
    revalidatePath("/teacher/exams");
    return ok({ id: exam.id as string });
  } catch (error) {
    return handleError(error);
  }
}

export async function getExamsAdmin(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("exams:manage");
    const exams = await db.exam.findMany({
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ examDate: "desc" }],
    });
    return ok(exams);
  } catch (error) {
    return handleError(error);
  }
}

export async function getExamsForTeacher(): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("exams:write");
    if (user.role !== Role.TEACHER || !user.teacherProfileId) {
      throw new ForbiddenError();
    }

    const classIds = await getTeacherClassIds(user.teacherProfileId);
    if (classIds.length === 0) return ok([]);

    const subjectLinks = await db.teacherSubject.findMany({
      where: { teacherId: user.teacherProfileId },
      select: { subjectId: true },
    });
    const subjectIds = subjectLinks.map((s) => s.subjectId);

    const exams = await db.exam.findMany({
      where: {
        classId: { in: classIds },
        subjectId: { in: subjectIds },
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: [{ examDate: "desc" }],
    });

    return ok(exams);
  } catch (error) {
    return handleError(error);
  }
}

export async function getExamMarkEntry(
  examId: string
): Promise<
  ActionResult<{
    exam: {
      id: string;
      name: string;
      maxMarks: number;
      status: string;
      showRanks: boolean;
      class: { name: string };
      subject: { name: string };
    };
    students: { id: string; rollNo: string; name: string }[];
    results: Record<string, number>;
  }>
> {
  try {
    const user = await requirePermission("exams:write");
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
    if (!exam) return fail("Exam not found");

    await assertTeacherCanEnterMarks(user, exam as { classId: string; subjectId: string; status: string });

    const students = await db.studentProfile.findMany({
      where: { classId: exam.classId },
      include: { user: { select: { name: true } } },
      orderBy: { rollNo: "asc" },
    });

    const results = await db.examResult.findMany({
      where: { examId },
      select: { studentId: true, marks: true },
    });

    const resultMap = Object.fromEntries(
      results.map((r) => [r.studentId as string, r.marks as number])
    );

    return ok({
      exam: {
        id: exam.id as string,
        name: exam.name as string,
        maxMarks: exam.maxMarks as number,
        status: exam.status as string,
        showRanks: exam.showRanks as boolean,
        class: exam.class as { name: string },
        subject: exam.subject as { name: string },
      },
      students: students.map((s) => ({
        id: s.id as string,
        rollNo: s.rollNo as string,
        name: (s.user as { name: string }).name,
      })),
      results: resultMap,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function saveExamResults(
  input: z.infer<typeof saveExamResultsSchema>
): Promise<ActionResult<{ saved: number }>> {
  try {
    const user = await requirePermission("exams:write");
    const parsed = saveExamResultsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const exam = await assertCanManageExam(parsed.data.examId);
    if (exam.status === ExamStatus.PUBLISHED) {
      return fail("Cannot edit marks for a published exam");
    }

    await assertTeacherCanEnterMarks(user, exam);

    const maxMarks = exam.maxMarks as number;
    for (const row of parsed.data.results) {
      if (row.marks > maxMarks) {
        return fail(`Marks cannot exceed ${maxMarks}`);
      }

      const percentage = computePercentage(row.marks, maxMarks);
      const existing = await db.examResult.findFirst({
        where: { examId: parsed.data.examId, studentId: row.studentId },
      });

      const data = {
        marks: row.marks,
        percentage,
        gradeLetter: scoreToGradeLetter(percentage),
        enteredBy: user.id,
      };

      if (existing) {
        await db.examResult.update({ where: { id: existing.id }, data });
      } else {
        await db.examResult.create({
          data: {
            examId: parsed.data.examId,
            studentId: row.studentId,
            ...data,
          },
        });
      }
    }

    revalidatePath(`/teacher/exams/${parsed.data.examId}`);
    revalidatePath("/teacher/exams");
    return ok({ saved: parsed.data.results.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function publishExam(examId: string): Promise<ActionResult<{ published: number }>> {
  try {
    await requirePermission("exams:manage");
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
    if (!exam) return fail("Exam not found");
    if (exam.status === ExamStatus.PUBLISHED) return fail("Exam already published");

    const results = await db.examResult.findMany({
      where: { examId },
      select: { id: true, studentId: true, marks: true },
    });
    if (results.length === 0) return fail("Enter marks before publishing");

    const maxMarks = exam.maxMarks as number;
    const ranked = computeRanks(
      results.map((r) => ({ studentId: r.studentId as string, marks: r.marks as number })),
      maxMarks
    );

    for (const row of ranked) {
      const existing = results.find((r) => r.studentId === row.studentId);
      if (!existing) continue;
      await db.examResult.update({
        where: { id: existing.id },
        data: {
          marks: row.marks,
          percentage: row.percentage,
          gradeLetter: row.gradeLetter,
          rank: exam.showRanks ? row.rank : null,
        },
      });

      const existingGrade = await db.grade.findFirst({
        where: {
          studentId: row.studentId,
          subjectId: exam.subjectId as string,
          term: exam.term as string,
        },
      });

      if (existingGrade) {
        await db.grade.update({
          where: { id: existingGrade.id },
          data: {
            score: row.marks,
            maxScore: maxMarks,
            examType: exam.type as ExamType,
          },
        });
      } else {
        await db.grade.create({
          data: {
            studentId: row.studentId,
            subjectId: exam.subjectId as string,
            term: exam.term as string,
            score: row.marks,
            maxScore: maxMarks,
            examType: exam.type as ExamType,
          },
        });
      }
    }

    await db.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.PUBLISHED, publishedAt: new Date() },
    });

    const students = await db.studentProfile.findMany({
      where: {
        id: { in: ranked.map((r) => r.studentId) },
      },
      include: { user: { select: { id: true } } },
    });

    await db.notification.createMany({
      data: students.map((s) => ({
        userId: (s.user as { id: string }).id,
        type: NotificationType.EXAM_RESULT,
        title: `${exam.name} results published`,
        body: `${exam.subject.name} · ${exam.class.name} — view your marks in ScholarOS.`,
      })),
    });

    revalidatePath("/admin/exams");
    revalidatePath("/teacher/exams");
    revalidatePath("/student/exams");
    revalidatePath("/parent/exams");
    return ok({ published: ranked.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function getPublishedExamResults(
  examId: string
): Promise<ActionResult<unknown>> {
  try {
    const user = await requirePermission("exams:read");
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
    if (!exam) return fail("Exam not found");
    if (exam.status !== ExamStatus.PUBLISHED) return fail("Results not published yet");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanEnterMarks(user, exam as { classId: string; subjectId: string; status: string });
    }

    const results = await db.examResult.findMany({
      where: { examId },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: [{ rank: "asc" }, { student: { rollNo: "asc" } }],
    });

    if (user.role === Role.STUDENT && user.studentProfileId) {
      const own = results.filter((r) => r.studentId === user.studentProfileId);
      return ok({ exam, results: own, showRanks: exam.showRanks });
    }

    if (user.role === Role.PARENT && user.parentProfileId) {
      const children = await db.parentStudent.findMany({
        where: { parentId: user.parentProfileId },
        select: { studentId: true },
      });
      const childIds = new Set(children.map((c) => c.studentId));
      const filtered = results.filter((r) => childIds.has(r.studentId));
      return ok({ exam, results: filtered, showRanks: exam.showRanks });
    }

    return ok({ exam, results, showRanks: exam.showRanks });
  } catch (error) {
    return handleError(error);
  }
}

export async function getStudentExams(
  studentId?: string
): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("exams:read");
    let targetStudentId = studentId;

    if (user.role === Role.STUDENT) {
      targetStudentId = user.studentProfileId ?? undefined;
    }

    if (!targetStudentId) {
      if (user.role === Role.PARENT && user.parentProfileId) {
        const children = await db.parentStudent.findMany({
          where: { parentId: user.parentProfileId },
          include: { student: { include: { user: { select: { name: true } }, class: { select: { name: true } } } } },
        });
        const allResults = [];
        for (const link of children) {
          const childResults = await getPublishedResultsForStudent(link.studentId as string);
          allResults.push({
            student: link.student,
            exams: childResults,
          });
        }
        return ok(allResults);
      }
      return fail("Student not specified");
    }

    await assertCanAccessStudent(user, targetStudentId);
    const exams = await getPublishedResultsForStudent(targetStudentId);
    return ok(exams);
  } catch (error) {
    return handleError(error);
  }
}

async function getPublishedResultsForStudent(studentId: string) {
  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student) return [];

  const exams = await db.exam.findMany({
    where: { classId: student.classId, status: ExamStatus.PUBLISHED },
    include: { subject: { select: { name: true } } },
    orderBy: [{ examDate: "desc" }],
  });

  const results = await db.examResult.findMany({
    where: {
      studentId,
      examId: { in: exams.map((e) => e.id) },
    },
  });
  const resultByExam = new Map(results.map((r) => [r.examId, r]));

  return exams.map((exam) => ({
    exam,
    result: resultByExam.get(exam.id) ?? null,
  }));
}

export async function getExamRankList(examId: string): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requireRole(Role.ADMIN);
    void user;
    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return fail("Exam not found");
    if (exam.status !== ExamStatus.PUBLISHED) return fail("Exam not published");
    if (!exam.showRanks) return fail("Ranks hidden for this exam");

    const results = await db.examResult.findMany({
      where: { examId },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: [{ rank: "asc" }],
    });

    return ok(results);
  } catch (error) {
    return handleError(error);
  }
}
