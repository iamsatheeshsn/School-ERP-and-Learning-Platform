import { Role } from "@/lib/types/enums";
import { getStudentTransport } from "@/actions/transport";
import { TransportAssignmentView } from "@/components/dashboard/shared/transport-assignment-view";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

type ChildGroup = {
  student: { user: { name: string } };
  assignment: Parameters<typeof TransportAssignmentView>[0]["assignment"];
};

export default async function ParentTransportPage() {
  await requireRole(Role.PARENT);

  const result = await getStudentTransport();
  const groups = result.success ? (result.data as ChildGroup[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Transport" description="Bus routes and pickup stops for your children." />
      {groups.map((group) => (
        <TransportAssignmentView
          key={group.student.user.name}
          title={group.student.user.name}
          assignment={group.assignment}
        />
      ))}
    </div>
  );
}
