import { Role } from "@/lib/types/enums";
import { getMyLeaveRequests } from "@/actions/leave";
import { LeaveRequestForm } from "@/components/dashboard/teacher/leave-request-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherLeavePage() {
  await requireRole(Role.TEACHER);

  const result = await getMyLeaveRequests();
  const requests = result.success
    ? (result.data as Parameters<typeof LeaveRequestForm>[0]["requests"])
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leave"
        description="Submit leave requests for admin approval."
      />

      {!result.success && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      <LeaveRequestForm requests={requests} />
    </div>
  );
}
