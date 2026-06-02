import { Role } from "@/lib/types/enums";
import { getStudentLibraryIssues } from "@/actions/library";
import { LibraryIssuesView } from "@/components/dashboard/shared/library-issues-view";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

type ChildGroup = {
  student: { user: { name: string }; class: { name: string } };
  issues: Parameters<typeof LibraryIssuesView>[0]["issues"];
};

export default async function ParentLibraryPage() {
  await requireRole(Role.PARENT);

  const result = await getStudentLibraryIssues();
  const groups = result.success ? (result.data as ChildGroup[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description="Books borrowed by your children." />
      {groups.map((group) => (
        <LibraryIssuesView
          key={group.student.user.name}
          title={`${group.student.user.name} · ${group.student.class.name}`}
          issues={group.issues}
        />
      ))}
    </div>
  );
}
