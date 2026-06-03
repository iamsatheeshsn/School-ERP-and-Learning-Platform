import { Role } from "@/lib/types/enums";
import { Bus } from "lucide-react";
import { getStudentTransport } from "@/actions/transport";
import { TransportAssignmentView } from "@/components/dashboard/shared/transport-assignment-view";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

type ChildGroup = {
  student: { user: { name: string } };
  assignment: Parameters<typeof TransportAssignmentView>[0]["assignment"];
};

export default async function ParentTransportPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);
  const result = await getStudentTransport();
  const groups = result.success ? (result.data as ChildGroup[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport"
        description="Bus routes and pickup stops for your children."
      />

      {!result.success && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      {result.success && children.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="No children linked"
          description="Link your account to view transport assignments."
        />
      ) : result.success && groups.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="No transport assigned"
          description="Route details will appear here once your child is assigned to a bus."
        />
      ) : (
        groups.map((group) => (
          <TransportAssignmentView
            key={group.student.user.name}
            title={group.student.user.name}
            assignment={group.assignment}
          />
        ))
      )}
    </div>
  );
}
