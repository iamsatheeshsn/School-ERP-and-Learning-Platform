import { Role } from "@/lib/types/enums";
import { ClipboardList } from "lucide-react";
import { getStudentExams } from "@/actions/exams";
import { StudentExamResults } from "@/components/dashboard/shared/exam-results-view";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

type ChildExamGroup = {
  student: {
    user: { name: string };
    class: { name: string };
  };
  exams: Array<{
    exam: {
      id: string;
      name: string;
      type: string;
      examDate: string | Date;
      maxMarks: number;
      showRanks?: boolean;
      subject?: { name: string };
    };
    result: {
      marks: number;
      percentage: number;
      gradeLetter: string;
      rank?: number | null;
    } | null;
  }>;
};

export default async function ParentExamsPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const result = await getStudentExams();
  const groups = result.success ? (result.data as ChildExamGroup[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Results"
        description="View published exam results for your children."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No results yet"
          description="Exam results will appear here after they are published."
        />
      ) : (
        groups.map((group) => (
          <StudentExamResults
            key={group.student.user.name}
            title={`${group.student.user.name} · ${group.student.class.name}`}
            items={group.exams}
          />
        ))
      )}
    </div>
  );
}
