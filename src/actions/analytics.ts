"use server";

import { HomeworkSubmissionStatus, Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateCohortInsights } from "@/lib/ai/services";
import {
  assertCanAccessStudent,
  assertTeacherCanAccessClass,
  getTeacherStudents,
} from "@/lib/queries/students";
import { AuthError, ForbiddenError, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";
import {
  ATTENDANCE_THRESHOLD_PCT,
  checkAttendanceThresholdFlags,
} from "@/lib/queries/attendance";

const studentAnalyticsSchema = z.object({
  studentId: z.string(),
  term: z.string().optional(),
});

const classAnalyticsSchema = z.object({
  classId: z.string(),
  term: z.string().optional(),
});

const classInsightsSchema = z.object({
  classId: z.string(),
  term: z.string().optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

const HOMEWORK_AT_RISK_PCT = 60;
const GRADE_AT_RISK_SCORE = 50;

export async function getStudentAnalytics(
  input: z.infer<typeof studentAnalyticsSchema>
): Promise<
  ActionResult<{
    attendance: Awaited<ReturnType<typeof checkAttendanceThresholdFlags>>;
    homework: { total: number; completed: number; completionPct: number };
    grades: { subject: string; score: number; maxScore: number }[];
    averageGrade: number;
  }>
> {
  try {
    const user = await requirePermission("analytics:read");
    const parsed = studentAnalyticsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await assertCanAccessStudent(user, parsed.data.studentId);

    const attendance = await checkAttendanceThresholdFlags(parsed.data.studentId);

    const submissions = await db.homeworkSubmission.findMany({
      where: { studentId: parsed.data.studentId },
      select: { status: true },
    });
    const total = submissions.length;
    const completed = submissions.filter(
      (s) =>
        s.status === HomeworkSubmissionStatus.SUBMITTED ||
        s.status === HomeworkSubmissionStatus.GRADED ||
        s.status === HomeworkSubmissionStatus.RETURNED
    ).length;

    const gradeWhere = {
      studentId: parsed.data.studentId,
      ...(parsed.data.term ? { term: parsed.data.term } : {}),
    };
    const grades = await db.grade.findMany({
      where: gradeWhere,
      include: { subject: { select: { name: true } } },
    });

    const gradeRows = grades.map((g) => ({
      subject: g.subject.name,
      score: g.score,
      maxScore: g.maxScore,
    }));
    const averageGrade =
      gradeRows.length > 0
        ? Math.round(
            gradeRows.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
              gradeRows.length
          )
        : 0;

    return ok({
      attendance,
      homework: {
        total,
        completed,
        completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      grades: gradeRows,
      averageGrade,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getClassAnalytics(
  input: z.infer<typeof classAnalyticsSchema>
): Promise<
  ActionResult<{
    studentCount: number;
    averageAttendancePct: number;
    averageHomeworkCompletionPct: number;
    averageGrade: number;
    atRiskCount: number;
  }>
> {
  try {
    const user = await requirePermission("analytics:read");
    const parsed = classAnalyticsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, parsed.data.classId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const students = await db.studentProfile.findMany({
      where: { classId: parsed.data.classId },
      select: { id: true },
    });

    if (students.length === 0) {
      return ok({
        studentCount: 0,
        averageAttendancePct: 0,
        averageHomeworkCompletionPct: 0,
        averageGrade: 0,
        atRiskCount: 0,
      });
    }

    let attendanceSum = 0;
    let homeworkSum = 0;
    let gradeSum = 0;
    let atRiskCount = 0;

    for (const student of students) {
      const analytics = await getStudentAnalytics({
        studentId: student.id,
        term: parsed.data.term,
      });
      if (!analytics.success) continue;

      attendanceSum += analytics.data.attendance.attendancePct;
      homeworkSum += analytics.data.homework.completionPct;
      gradeSum += analytics.data.averageGrade;

      const atRisk = await isStudentAtRisk(student.id, parsed.data.term);
      if (atRisk) atRiskCount++;
    }

    const count = students.length;
    return ok({
      studentCount: count,
      averageAttendancePct: Math.round(attendanceSum / count),
      averageHomeworkCompletionPct: Math.round(homeworkSum / count),
      averageGrade: Math.round(gradeSum / count),
      atRiskCount,
    });
  } catch (error) {
    return handleError(error);
  }
}

async function isStudentAtRisk(studentId: string, term?: string): Promise<boolean> {
  const flags = await checkAttendanceThresholdFlags(studentId);
  if (flags.flagged) return true;

  const submissions = await db.homeworkSubmission.findMany({
    where: { studentId },
    select: { status: true },
  });
  const total = submissions.length;
  const completed = submissions.filter(
    (s) =>
      s.status === HomeworkSubmissionStatus.SUBMITTED ||
      s.status === HomeworkSubmissionStatus.GRADED
  ).length;
  const homeworkPct = total > 0 ? (completed / total) * 100 : 100;
  if (homeworkPct < HOMEWORK_AT_RISK_PCT) return true;

  const grades = await db.grade.findMany({
    where: { studentId, ...(term ? { term } : {}) },
    select: { score: true, maxScore: true },
  });
  if (grades.length === 0) return false;

  const avg =
    grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length;
  return avg < GRADE_AT_RISK_SCORE;
}

export async function getAtRiskStudents(
  classId?: string
): Promise<
  ActionResult<
    {
      studentId: string;
      name: string;
      rollNo: string;
      reasons: string[];
    }[]
  >
> {
  try {
    const user = await requirePermission("analytics:read");

    let students: { id: string; rollNo: string; user: { name: string } }[];

    if (classId) {
      if (user.role === Role.TEACHER) {
        await assertTeacherCanAccessClass(user, classId);
      } else if (user.role !== Role.ADMIN) {
        throw new ForbiddenError();
      }
      students = await db.studentProfile.findMany({
        where: { classId },
        include: { user: { select: { name: true } } },
      });
    } else if (user.role === Role.TEACHER && user.teacherProfileId) {
      const teacherStudents = await getTeacherStudents(user.teacherProfileId);
      students = teacherStudents.map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        user: s.user,
      }));
    } else if (user.role === Role.ADMIN) {
      students = await db.studentProfile.findMany({
        include: { user: { select: { name: true } } },
      });
    } else {
      throw new ForbiddenError();
    }

    const atRisk: { studentId: string; name: string; rollNo: string; reasons: string[] }[] =
      [];

    for (const student of students) {
      const reasons: string[] = [];
      const flags = await checkAttendanceThresholdFlags(student.id);
      if (flags.lowAttendance) {
        reasons.push(`Attendance below ${ATTENDANCE_THRESHOLD_PCT}% (${flags.attendancePct}%)`);
      }
      if (flags.consecutiveAbsenceFlag) {
        reasons.push(`${flags.consecutiveAbsences} consecutive absences`);
      }

      const submissions = await db.homeworkSubmission.findMany({
        where: { studentId: student.id },
        select: { status: true },
      });
      const total = submissions.length;
      const completed = submissions.filter(
        (s) =>
          s.status === HomeworkSubmissionStatus.SUBMITTED ||
          s.status === HomeworkSubmissionStatus.GRADED
      ).length;
      const homeworkPct = total > 0 ? Math.round((completed / total) * 100) : 100;
      if (homeworkPct < HOMEWORK_AT_RISK_PCT) {
        reasons.push(`Homework completion below ${HOMEWORK_AT_RISK_PCT}% (${homeworkPct}%)`);
      }

      const grades = await db.grade.findMany({
        where: { studentId: student.id },
        select: { score: true, maxScore: true },
      });
      if (grades.length > 0) {
        const avg = Math.round(
          grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length
        );
        if (avg < GRADE_AT_RISK_SCORE) {
          reasons.push(`Average grade below ${GRADE_AT_RISK_SCORE}% (${avg}%)`);
        }
      }

      if (reasons.length > 0) {
        atRisk.push({
          studentId: student.id,
          name: student.user.name,
          rollNo: student.rollNo,
          reasons,
        });
      }
    }

    return ok(atRisk);
  } catch (error) {
    return handleError(error);
  }
}

export async function generateClassInsights(
  input: z.infer<typeof classInsightsSchema>
): Promise<ActionResult<unknown>> {
  try {
    const user = await requirePermission("analytics:read");
    const parsed = classInsightsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, parsed.data.classId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const classAnalytics = await getClassAnalytics({
      classId: parsed.data.classId,
      term: parsed.data.term,
    });
    if (!classAnalytics.success) return fail(classAnalytics.error);

    const atRisk = await getAtRiskStudents(parsed.data.classId);
    if (!atRisk.success) return fail(atRisk.error);

    const students = await db.studentProfile.findMany({
      where: { classId: parsed.data.classId },
      include: { user: { select: { name: true } } },
    });

    const classData = {
      classId: parsed.data.classId,
      term: parsed.data.term,
      summary: classAnalytics.data,
      students: students.map((s) => s.user.name),
      atRiskStudents: atRisk.data,
    };

    const insights = await generateCohortInsights(user.id, classData);
    return ok(insights);
  } catch (error) {
    return handleError(error);
  }
}
