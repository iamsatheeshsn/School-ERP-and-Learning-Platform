import { Role } from "@prisma/client";
import { Baby, BookOpen, ClipboardCheck, Wallet } from "lucide-react";
import { getParentChildrenAttendanceSummary } from "@/actions/attendance";
import { getInvoicesForParent } from "@/actions/fees";
import { getHomeworkForStudent } from "@/actions/homework";
import { getUnreadCount } from "@/actions/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentDashboardPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);
  const firstChildId = children[0]?.id;

  const [attendanceResult, invoicesResult, homeworkResult, unreadResult] =
    await Promise.all([
      getParentChildrenAttendanceSummary(),
      getInvoicesForParent(),
      firstChildId ? getHomeworkForStudent(firstChildId) : Promise.resolve({ success: true as const, data: [] }),
      getUnreadCount(),
    ]);

  const flagged =
    attendanceResult.success
      ? attendanceResult.data.filter((s) => s.flags.flagged).length
      : 0;

  const invoices = invoicesResult.success
    ? (invoicesResult.data as { status: string }[])
    : [];
  const pendingFees = invoices.filter((inv) => inv.status === "PENDING").length;

  const homework = homeworkResult.success
    ? (homeworkResult.data as { status: string }[])
    : [];
  const pendingHomework = homework.filter((sub) => sub.status === "PENDING").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Stay connected with your children's progress."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Children" value={children.length} icon={Baby} accent="fuchsia" />
        <StatCard title="Pending Homework" value={pendingHomework} icon={BookOpen} accent="sky" />
        <StatCard title="Attendance Alerts" value={flagged} icon={ClipboardCheck} accent="rose" />
        <StatCard title="Pending Fees" value={pendingFees} icon={Wallet} accent="amber" />
      </div>

      {unreadResult.success && unreadResult.data.count > 0 && (
        <Card>
          <CardContent className="py-4 text-sm">
            {unreadResult.data.count} unread notification
            {unreadResult.data.count !== 1 ? "s" : ""}.
          </CardContent>
        </Card>
      )}

      {children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Your children</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {children.map((child) => (
                <li key={child.id}>
                  <span className="font-medium">{child.user.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {child.class.name} (Roll {child.rollNo})
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
