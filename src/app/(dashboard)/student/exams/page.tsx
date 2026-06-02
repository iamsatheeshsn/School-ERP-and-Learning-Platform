import { Role } from "@/lib/types/enums";
import { ClipboardList } from "lucide-react";
import { getStudentExams } from "@/actions/exams";
import { StudentExamResults } from "@/components/dashboard/shared/exam-results-view";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentExamsPage() {
  const user = await requireRole(Role.STUDENT);
  if (!user.studentProfileId) {
    return <p className="text-muted-foreground">Student profile not found.</p>;
  }

  const result = await getStudentExams(user.studentProfileId);
  const items = result.success
    ? (result.data as Array<{
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
      }>)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Results"
        description="Published exam marks and class ranks."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No results yet"
          description="Your exam results will appear here after they are published."
        />
      ) : (
        <StudentExamResults title="My exams" items={items} />
      )}
    </div>
  );
}
