"use server";

import { HomeworkSubmissionStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateHomeworkWorksheet } from "@/lib/ai/services";
import {
  assertCanAccessStudent,
  assertTeacherCanAccessClass,
} from "@/lib/queries/students";
import { AuthError, ForbiddenError, requireAuth, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult, type AttachmentMeta } from "@/lib/types";

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
});

const createHomeworkSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.string().datetime(),
  attachments: z.array(attachmentSchema).optional(),
});

const updateHomeworkSchema = createHomeworkSchema.partial().extend({
  id: z.string(),
});

const submitHomeworkSchema = z.object({
  homeworkId: z.string(),
  content: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const gradeSubmissionSchema = z.object({
  submissionId: z.string(),
  grade: z.number().min(0),
  maxGrade: z.number().min(1).optional(),
  teacherNotes: z.string().optional(),
});

const worksheetSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function homeworkPaths(classId: string) {
  revalidatePath("/teacher/homework");
  revalidatePath("/student/homework");
  revalidatePath("/parent/homework");
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function createHomework(
  input: z.infer<typeof createHomeworkSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("homework:write");
    const parsed = createHomeworkSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertTeacherCanAccessClass(user, parsed.data.classId);

    const homework = await db.homework.create({
      data: {
        classId: parsed.data.classId,
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: new Date(parsed.data.dueDate),
        attachments: (parsed.data.attachments ?? []) as AttachmentMeta[],
        createdBy: user.id,
      },
    });

    const classStudents = await db.studentProfile.findMany({
      where: { classId: parsed.data.classId },
      select: { id: true },
    });

    if (classStudents.length > 0) {
      await db.homeworkSubmission.createMany({
        data: classStudents.map((s) => ({
          homeworkId: homework.id,
          studentId: s.id,
          status: HomeworkSubmissionStatus.PENDING,
        })),
        skipDuplicates: true,
      });
    }

    homeworkPaths(parsed.data.classId);
    return ok({ id: homework.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateHomework(
  input: z.infer<typeof updateHomeworkSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("homework:write");
    const parsed = updateHomeworkSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const existing = await db.homework.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return fail("Homework not found");

    await assertTeacherCanAccessClass(user, existing.classId);

    const { id, dueDate, attachments, ...rest } = parsed.data;
    const homework = await db.homework.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(attachments !== undefined ? { attachments: attachments as AttachmentMeta[] } : {}),
      },
    });

    homeworkPaths(homework.classId);
    return ok({ id: homework.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteHomework(homeworkId: string): Promise<ActionResult<void>> {
  try {
    const user = await requirePermission("homework:write");
    if (!homeworkId) return fail("Homework ID required");

    const existing = await db.homework.findUnique({ where: { id: homeworkId } });
    if (!existing) return fail("Homework not found");

    await assertTeacherCanAccessClass(user, existing.classId);

    await db.homework.delete({ where: { id: homeworkId } });
    homeworkPaths(existing.classId);
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function getHomeworkByClass(classId: string): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("homework:read");
    if (!classId) return fail("Class ID required");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, classId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const homework = await db.homework.findMany({
      where: { classId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        creator: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "desc" },
    });

    return ok(homework);
  } catch (error) {
    return handleError(error);
  }
}

export async function getHomeworkForStudent(
  studentId?: string
): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("homework:read");

    const targetStudentId =
      user.role === Role.STUDENT ? user.studentProfileId : studentId;

    if (!targetStudentId) return fail("Student ID required");

    await assertCanAccessStudent(user, targetStudentId);

    const submissions = await db.homeworkSubmission.findMany({
      where: { studentId: targetStudentId },
      include: {
        homework: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { homework: { dueDate: "desc" } },
    });

    return ok(submissions);
  } catch (error) {
    return handleError(error);
  }
}

export async function submitHomework(
  input: z.infer<typeof submitHomeworkSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("homework:submit");
    const parsed = submitHomeworkSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (!user.studentProfileId) return fail("Student profile not found");

    const homework = await db.homework.findUnique({
      where: { id: parsed.data.homeworkId },
      select: { id: true, classId: true },
    });
    if (!homework) return fail("Homework not found");

    const student = await db.studentProfile.findUnique({
      where: { id: user.studentProfileId },
      select: { classId: true },
    });
    if (!student || student.classId !== homework.classId) {
      return fail("Homework not assigned to your class");
    }

    const submission = await db.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId: parsed.data.homeworkId,
          studentId: user.studentProfileId,
        },
      },
      create: {
        homeworkId: parsed.data.homeworkId,
        studentId: user.studentProfileId,
        content: parsed.data.content ?? null,
        attachments: (parsed.data.attachments ?? []) as AttachmentMeta[],
        submittedAt: new Date(),
        status: HomeworkSubmissionStatus.SUBMITTED,
      },
      update: {
        content: parsed.data.content ?? null,
        attachments: (parsed.data.attachments ?? []) as AttachmentMeta[],
        submittedAt: new Date(),
        status: HomeworkSubmissionStatus.SUBMITTED,
      },
    });

    revalidatePath("/student/homework");
    return ok({ id: submission.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function gradeSubmission(
  input: z.infer<typeof gradeSubmissionSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("homework:write");
    const parsed = gradeSubmissionSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const submission = await db.homeworkSubmission.findUnique({
      where: { id: parsed.data.submissionId },
      include: { homework: { select: { classId: true } } },
    });
    if (!submission) return fail("Submission not found");

    await assertTeacherCanAccessClass(user, submission.homework.classId);

    const updated = await db.homeworkSubmission.update({
      where: { id: parsed.data.submissionId },
      data: {
        grade: parsed.data.grade,
        maxGrade: parsed.data.maxGrade ?? submission.maxGrade,
        teacherNotes: parsed.data.teacherNotes,
        status: HomeworkSubmissionStatus.GRADED,
      },
    });

    revalidatePath("/teacher/homework");
    return ok({ id: updated.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function generateWorksheet(
  input: z.infer<typeof worksheetSchema>
): Promise<ActionResult<{ title: string; description: string; difficulty: string; estimatedMinutes: number }>> {
  try {
    const user = await requirePermission("homework:write");
    const parsed = worksheetSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertTeacherCanAccessClass(user, parsed.data.classId);

    const cls = await db.class.findUnique({
      where: { id: parsed.data.classId },
      select: { grade: true },
    });
    const subject = await db.subject.findUnique({
      where: { id: parsed.data.subjectId },
      select: { name: true },
    });
    if (!cls || !subject) return fail("Class or subject not found");

    const worksheet = await generateHomeworkWorksheet(user.id, {
      topic: parsed.data.topic,
      difficulty: parsed.data.difficulty,
      subject: subject.name,
      grade: cls.grade,
    });

    return ok(worksheet);
  } catch (error) {
    return handleError(error);
  }
}
