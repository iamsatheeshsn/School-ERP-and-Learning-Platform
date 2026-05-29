import { Role } from "@prisma/client";
import { format } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { getStudentAttendance } from "@/actions/attendance";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentAttendancePage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);

  const attendanceByChild = await Promise.all(
    children.map(async (child) => {
      const result = await getStudentAttendance({ studentId: child.id });
      return { child, result };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="View attendance records and alerts for your children."
      />

      {children.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No children linked"
          description="Link your account to view attendance records."
        />
      ) : (
        attendanceByChild.map(({ child, result }) => (
          <Card key={child.id}>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                {child.user.name}
              </CardTitle>
              {result.success && result.data.flags.flagged && (
                <Badge variant="destructive">Attention needed</Badge>
              )}
            </CardHeader>
            <CardContent>
              {result.success ? (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Attendance rate: {result.data.flags.attendancePct}%
                  </p>
                  {(result.data.records as { date: string | Date; status: string }[])
                    .slice(0, 10)
                    .map((record) => (
                      <div
                        key={String(record.date)}
                        className="flex justify-between border-b border-border/40 py-2 text-sm last:border-0"
                      >
                        <span>
                          {format(new Date(record.date), "EEE, MMM d, yyyy")}
                        </span>
                        <Badge variant="outline">{record.status}</Badge>
                      </div>
                    ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{result.error}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
