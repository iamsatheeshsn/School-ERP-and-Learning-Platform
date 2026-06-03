import { Role } from "@/lib/types/enums";
import { getLeaveRequestsAdmin } from "@/actions/leave";
import { LeaveApprovalPanel } from "@/components/dashboard/admin/leave-approval-panel";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminLeavePage() {
  await requireRole(Role.ADMIN);

  const result = await getLeaveRequestsAdmin();
  const requests = result.success
    ? (result.data as Parameters<typeof LeaveApprovalPanel>[0]["requests"])
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Staff leave"
        description="Review and approve teacher leave requests."
      />

      {!result.success && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      <LeaveApprovalPanel requests={requests} />
    </div>
  );
}
