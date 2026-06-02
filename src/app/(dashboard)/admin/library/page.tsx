import { Role } from "@/lib/types/enums";
import { getLibraryContext, getLibraryIssuesAdmin } from "@/actions/library";
import { LibraryManager } from "@/components/dashboard/admin/library-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminLibraryPage() {
  await requireRole(Role.ADMIN);

  const [contextResult, issuesResult] = await Promise.all([
    getLibraryContext(),
    getLibraryIssuesAdmin(),
  ]);

  if (!contextResult.success) {
    return <p className="text-muted-foreground">{contextResult.error}</p>;
  }

  const issues = issuesResult.success ? (issuesResult.data as Parameters<typeof LibraryManager>[0]["activeIssues"]) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Library"
        description="Manage catalog, issue and return books, track overdue fines."
      />
      <LibraryManager
        schoolId={contextResult.data.schoolId}
        books={contextResult.data.books as Parameters<typeof LibraryManager>[0]["books"]}
        students={contextResult.data.students}
        activeIssues={issues}
      />
    </div>
  );
}
