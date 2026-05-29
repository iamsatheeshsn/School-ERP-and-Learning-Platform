import { Role } from "@prisma/client";
import { BookOpen } from "lucide-react";
import { getHomeworkForStudent } from "@/actions/homework";
import { StudentHomeworkList } from "@/components/dashboard/student/homework-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentHomeworkPage() {
  await requireRole(Role.STUDENT);

  const result = await getHomeworkForStudent();
  const submissions = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        description="View assignments, submit work, and get AI tutoring help."
      />

      {!result.success ? (
        <p className="text-muted-foreground">{result.error}</p>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No homework assigned"
          description="Check back later for new assignments from your teachers."
        />
      ) : (
        <StudentHomeworkList
          submissions={
            submissions as Parameters<typeof StudentHomeworkList>[0]["submissions"]
          }
        />
      )}
    </div>
  );
}
