import { NextResponse } from "next/server";
import { ReportCardStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { generateReportCardPdf } from "@/lib/pdf/generate";
import { getSessionUser } from "@/lib/rbac/guards";
import { assertCanAccessStudent } from "@/lib/queries/students";
import { checkAttendanceThresholdFlags } from "@/lib/queries/attendance";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reportCard = await db.reportCard.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
      academicYear: { select: { name: true } },
    },
  });

  if (!reportCard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    (user.role === "PARENT" || user.role === "STUDENT") &&
    reportCard.status !== ReportCardStatus.PUBLISHED
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await assertCanAccessStudent(user, reportCard.studentId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flags = await checkAttendanceThresholdFlags(reportCard.studentId);
  const submissions = await db.homeworkSubmission.count({
    where: {
      studentId: reportCard.studentId,
      status: { in: ["SUBMITTED", "GRADED", "RETURNED"] },
    },
  });
  const total = await db.homeworkSubmission.count({
    where: { studentId: reportCard.studentId },
  });

  const school = await db.school.findFirst();
  const subjectGrades = reportCard.subjectGrades as {
    subject: string;
    score: number;
    grade?: string;
  }[];

  const pdf = await generateReportCardPdf({
    schoolName: school?.name ?? "ScholarOS School",
    studentName: reportCard.student.user.name,
    className: reportCard.student.class.name,
    term: reportCard.term,
    academicYear: reportCard.academicYear.name,
    aiSummary: reportCard.aiSummary ?? "",
    teacherRemarks: reportCard.teacherRemarks,
    subjectGrades,
    attendancePct: flags.attendancePct,
    homeworkCompletionPct: total > 0 ? Math.round((submissions / total) * 100) : 0,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-card-${reportCard.term}.pdf"`,
    },
  });
}
