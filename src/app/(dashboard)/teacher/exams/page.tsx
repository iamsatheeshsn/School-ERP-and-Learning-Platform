import { Role } from "@/lib/types/enums";
import { ClipboardList } from "lucide-react";
import { getExamsForTeacher } from "@/actions/exams";
import { TeacherExamsList } from "@/components/dashboard/teacher/exams-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherExamsPage() {
  await requireRole(Role.TEACHER);

  const result = await getExamsForTeacher();
  const exams = result.success
    ? (result.data as {
        id: string;
        name: string;
        type: string;
        term: string;
        examDate: string | Date;
        maxMarks: number;
        status: string;
        class: { name: string };
        subject: { name: string };
      }[])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Enter marks for scheduled exams in your classes."
      />

      {!result.success && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      {result.success && exams.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No exams scheduled"
          description="Your admin will schedule exams for your classes."
        />
      ) : result.success ? (
        <TeacherExamsList exams={exams} />
      ) : null}
    </div>
  );
}
