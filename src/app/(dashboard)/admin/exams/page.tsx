import { Role } from "@/lib/types/enums";
import { getExamsAdmin } from "@/actions/exams";
import { ExamsManager } from "@/components/dashboard/admin/exams-manager";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminExamsPage() {
  await requireRole(Role.ADMIN);

  const [examsResult, classes, subjects] = await Promise.all([
    getExamsAdmin(),
    db.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.subject.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const exams = examsResult.success
    ? (examsResult.data as {
        id: string;
        name: string;
        type: string;
        term: string;
        examDate: string | Date;
        maxMarks: number;
        status: string;
        showRanks: boolean;
        class: { name: string };
        subject: { name: string };
      }[])
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exams & Gradebook"
        description="Schedule exams, collect marks from teachers, and publish results with ranks."
      />
      <ExamsManager classes={classes} subjects={subjects} exams={exams} />
    </div>
  );
}
