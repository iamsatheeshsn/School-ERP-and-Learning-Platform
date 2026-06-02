import { Role } from "@/lib/types/enums";
import { getStudentTransport } from "@/actions/transport";
import { TransportAssignmentView } from "@/components/dashboard/shared/transport-assignment-view";
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
      <TransportAssignmentView title="My route" assignment={assignment} />
    </div>
  );
}
