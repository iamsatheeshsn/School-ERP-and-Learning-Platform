import { Role } from "@/lib/types/enums";
import { format } from "date-fns";
import { BookOpen } from "lucide-react";
import { getHomeworkForStudent } from "@/actions/homework";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentHomeworkPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);

  const homeworkByChild = await Promise.all(
    children.map(async (child) => {
      const result = await getHomeworkForStudent(child.id);
      return { child, result };
    })
  );

  const hasFetchError = homeworkByChild.some(({ result }) => !result.success);
  const hasHomework = homeworkByChild.some(
    ({ result }) => result.success && result.data.length > 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        description="Track homework assignments for your children."
      />

      {children.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No children linked"
          description="Link your account to view homework assignments."
        />
      ) : hasFetchError ? (
        homeworkByChild.map(({ child, result }) =>
          !result.success ? (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="font-heading text-lg">{child.user.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{result.error}</p>
              </CardContent>
            </Card>
          ) : null
        )
      ) : !hasHomework ? (
        <EmptyState
          icon={BookOpen}
          title="No homework"
          description="Homework assignments will appear here when teachers post them."
        />
      ) : (
        homeworkByChild.map(({ child, result }) =>
          result.success && result.data.length > 0 ? (
            <div key={child.id} className="space-y-3">
              <h2 className="font-heading text-lg font-semibold">
                {child.user.name}
              </h2>
              <div className="grid gap-3">
                {(result.data as {
                  id: string;
                  status: string;
                  homework: {
                    title: string;
                    dueDate: string | Date;
                    subject: { name: string };
                  };
                }[]).map((sub) => (
                  <Card key={sub.id}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base">
                          {sub.homework.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {sub.homework.subject.name} · Due{" "}
                          {format(new Date(sub.homework.dueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary">{sub.status}</Badge>
                    </CardHeader>
                    <CardContent />
                  </Card>
                ))}
              </div>
            </div>
          ) : null
        )
      )}
    </div>
  );
}
