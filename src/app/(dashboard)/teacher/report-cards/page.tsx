import { Role } from "@prisma/client";
import { FileText } from "lucide-react";
import { ReportCardsManager } from "@/components/dashboard/teacher/report-cards-manager";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { getTeacherStudents } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherReportCardsPage() {
  const user = await requireRole(Role.TEACHER);
  if (!user.teacherProfileId) {
    return <p className="text-muted-foreground">Teacher profile not found.</p>;
  }

  const [students, academicYears, reportCards] = await Promise.all([
    getTeacherStudents(user.teacherProfileId),
    db.academicYear.findMany({
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    db.reportCard.findMany({
      where: {
        student: {
          class: {
            teacherClasses: { some: { teacherId: user.teacherProfileId } },
          },
        },
      },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Cards"
          description="Generate AI-powered report cards and publish to parents."
        />
        <EmptyState
          icon={FileText}
          title="No students"
          description="Students will appear once assigned to your classes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="Generate AI-powered report cards and publish to parents."
      />
      <ReportCardsManager
        reportCards={reportCards.map((rc) => ({
          id: rc.id,
          term: rc.term,
          status: rc.status,
          publishedAt: rc.publishedAt,
          aiSummary: rc.aiSummary,
          student: {
            user: rc.student.user,
            rollNo: rc.student.rollNo,
          },
          academicYear: rc.academicYear,
        }))}
        students={students.map((s) => ({
          id: s.id,
          name: s.user.name,
          rollNo: s.rollNo,
        }))}
        academicYears={academicYears}
      />
    </div>
  );
}
