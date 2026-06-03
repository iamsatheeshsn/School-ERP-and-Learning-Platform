import { Role } from "@/lib/types/enums";
import { BookOpen } from "lucide-react";
import { getStudentLibraryIssues } from "@/actions/library";
import { LibraryIssuesView } from "@/components/dashboard/shared/library-issues-view";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentLibraryPage() {
  const user = await requireRole(Role.STUDENT);
  if (!user.studentProfileId) {
    return <p className="text-muted-foreground">Student profile not found.</p>;
  }

  const result = await getStudentLibraryIssues(user.studentProfileId);
  const issues = result.success
    ? (result.data as Parameters<typeof LibraryIssuesView>[0]["issues"])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description="Books you have borrowed." />

      {!result.success ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : issues.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books"
          description="Issued books will appear here."
        />
      ) : (
        <LibraryIssuesView title="My loans" issues={issues} />
      )}
    </div>
  );
}
