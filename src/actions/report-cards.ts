"use server";

import { NotificationType, ReportCardStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateReportCardSummary } from "@/lib/ai/services";
import { sendReportCardPublished } from "@/lib/email/resend";
import { assertCanAccessStudent } from "@/lib/queries/students";
import { AuthError, ForbiddenError, requireAuth, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";
import { checkAttendanceThresholdFlags } from "@/lib/queries/attendance";

const generateReportCardSchema = z.object({
  studentId: z.string(),
  academicYearId: z.string(),
  term: z.string().min(1),
});

const updateReportCardSchema = z.object({
  id: z.string(),
  teacherRemarks: z.string().optional(),
  subjectGrades: z
    .array(
      z.object({
        subject: z.string(),
        score: z.number(),
        grade: z.string().optional(),
      })
    )
    .optional(),
  aiSummary: z.string().optional(),
  status: z.nativeEnum(ReportCardStatus).optional(),
});

const publishSchema = z.object({
  id: z.string(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateReportCardPaths() {
  revalidatePath("/teacher/report-cards");
  revalidatePath("/parent/report-cards");
  revalidatePath("/student/report-cards");
}

async function computeStudentMetrics(studentId: string, term: string) {
  const grades = await db.grade.findMany({
    where: { studentId, term },
    include: { subject: { select: { name: true } } },
  });

  const submissions = await db.homeworkSubmission.findMany({
    where: { studentId },
    select: { status: true },
  });

  const totalHomework = submissions.length;
  const completed = submissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "GRADED" || s.status === "RETURNED"
  ).length;
  const homeworkCompletionPct =
    totalHomework > 0 ? Math.round((completed / totalHomework) * 100) : 0;

  const flags = await checkAttendanceThresholdFlags(studentId);

  return {
    grades: grades.map((g) => ({
      subject: g.subject.name,
      score: g.score,
      maxScore: g.maxScore,
    })),
    attendancePct: flags.attendancePct,
    homeworkCompletionPct,
  };
}

export async function generateReportCard(
  input: z.infer<typeof generateReportCardSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("report-cards:write");
    const parsed = generateReportCardSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertCanAccessStudent(user, parsed.data.studentId);

    const student = await db.studentProfile.findUnique({
      where: { id: parsed.data.studentId },
      include: { user: { select: { name: true } } },
    });
    if (!student) return fail("Student not found");

    const metrics = await computeStudentMetrics(parsed.data.studentId, parsed.data.term);

    const aiResult = await generateReportCardSummary(user.id, {
      studentName: student.user.name,
      term: parsed.data.term,
      grades: metrics.grades,
      attendancePct: metrics.attendancePct,
      homeworkCompletionPct: metrics.homeworkCompletionPct,
    });

    const reportCard = await db.reportCard.upsert({
      where: {
        studentId_academicYearId_term: {
          studentId: parsed.data.studentId,
          academicYearId: parsed.data.academicYearId,
          term: parsed.data.term,
        },
      },
      create: {
        studentId: parsed.data.studentId,
        academicYearId: parsed.data.academicYearId,
        term: parsed.data.term,
        aiSummary: aiResult.narrative,
        subjectGrades: metrics.grades.map((g) => ({
          subject: g.subject,
          score: g.score,
          grade: g.score >= 90 ? "A" : g.score >= 75 ? "B" : g.score >= 60 ? "C" : "D",
        })),
        status: ReportCardStatus.DRAFT,
      },
      update: {
        aiSummary: aiResult.narrative,
        subjectGrades: metrics.grades.map((g) => ({
          subject: g.subject,
          score: g.score,
          grade: g.score >= 90 ? "A" : g.score >= 75 ? "B" : g.score >= 60 ? "C" : "D",
        })),
      },
    });

    revalidateReportCardPaths();
    return ok({ id: reportCard.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateReportCard(
  input: z.infer<typeof updateReportCardSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("report-cards:write");
    const parsed = updateReportCardSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const existing = await db.reportCard.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return fail("Report card not found");

    await assertCanAccessStudent(user, existing.studentId);

    const { id, ...data } = parsed.data;
    const reportCard = await db.reportCard.update({
      where: { id },
      data,
    });

    revalidateReportCardPaths();
    return ok({ id: reportCard.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function publishReportCard(
  input: z.infer<typeof publishSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("report-cards:write");
    const parsed = publishSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const existing = await db.reportCard.findUnique({
      where: { id: parsed.data.id },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            parents: {
              include: {
                parent: { include: { user: { select: { id: true, email: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!existing) return fail("Report card not found");

    await assertCanAccessStudent(user, existing.studentId);

    const pdfUrl = `/api/report-cards/${parsed.data.id}/pdf`;

    const reportCard = await db.reportCard.update({
      where: { id: parsed.data.id },
      data: {
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
        pdfUrl,
      },
    });

    for (const link of existing.student.parents) {
      const parentUser = link.parent.user;
      await sendReportCardPublished(
        parentUser.email,
        parentUser.name,
        existing.student.user.name,
        existing.term
      );
      await db.notification.create({
        data: {
          userId: parentUser.id,
          type: NotificationType.REPORT_CARD,
          title: `Report card published — ${existing.student.user.name}`,
          body: `The ${existing.term} report card is now available.`,
          payload: { reportCardId: reportCard.id, studentId: existing.studentId },
        },
      });
    }

    revalidateReportCardPaths();
    return ok({ id: reportCard.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function getReportCardsForStudent(
  studentId?: string
): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("report-cards:read");

    const targetStudentId =
      user.role === Role.STUDENT ? user.studentProfileId : studentId;

    if (!targetStudentId) return fail("Student ID required");

    await assertCanAccessStudent(user, targetStudentId);

    const where =
      user.role === Role.STUDENT || user.role === Role.PARENT
        ? { studentId: targetStudentId, status: ReportCardStatus.PUBLISHED }
        : { studentId: targetStudentId };

    const reportCards = await db.reportCard.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(reportCards);
  } catch (error) {
    return handleError(error);
  }
}
