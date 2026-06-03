import { Role } from "@/lib/types/enums";
import { Bus } from "lucide-react";
import { getStudentTransport } from "@/actions/transport";
import { TransportAssignmentView } from "@/components/dashboard/shared/transport-assignment-view";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentTransportPage() {
  const user = await requireRole(Role.STUDENT);
  if (!user.studentProfileId) {
    return <p className="text-muted-foreground">Student profile not found.</p>;
  }

  const result = await getStudentTransport(user.studentProfileId);
  const assignment = result.success
    ? (result.data as Parameters<typeof TransportAssignmentView>[0]["assignment"])
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Transport" description="Your assigned bus route and pickup stop." />

      {!result.success ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : !assignment ? (
        <EmptyState
          icon={Bus}
          title="No transport assigned"
          description="Route details will appear here once you are assigned to a bus."
        />
      ) : (
        <TransportAssignmentView title="My route" assignment={assignment} />
      )}
    </div>
  );
}
