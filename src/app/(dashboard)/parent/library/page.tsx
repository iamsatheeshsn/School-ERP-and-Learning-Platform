import { Role } from "@/lib/types/enums";
import { BookOpen } from "lucide-react";
import { getStudentLibraryIssues } from "@/actions/library";
import { LibraryIssuesView } from "@/components/dashboard/shared/library-issues-view";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

type ChildGroup = {
  student: { user: { name: string }; class: { name: string } };
  issues: Parameters<typeof LibraryIssuesView>[0]["issues"];
};

export default async function ParentLibraryPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);
  const result = await getStudentLibraryIssues();
  const groups = result.success ? (result.data as ChildGroup[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description="Books borrowed by your children." />

      {!result.success && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      {result.success && children.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No children linked"
          description="Link your account to view library activity."
        />
      ) : result.success && groups.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No library activity"
          description="Borrowed books will appear here when issued from the school library."
        />
      ) : (
        groups.map((group) => (
          <LibraryIssuesView
            key={group.student.user.name}
            title={`${group.student.user.name} · ${group.student.class.name}`}
            issues={group.issues}
          />
        ))
      )}
    </div>
  );
}
