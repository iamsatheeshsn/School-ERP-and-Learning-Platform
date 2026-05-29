import { Role } from "@prisma/client";
import {
  AlertTriangle,
  School,
  Users,
  Wallet,
} from "lucide-react";
import { getAtRiskStudents } from "@/actions/analytics";
import { getInvoicesAdmin } from "@/actions/fees";
import { getUnreadCount } from "@/actions/notifications";
import { AtRiskTable, type AtRiskRow } from "@/components/dashboard/admin/at-risk-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminDashboardPage() {
  await requireRole(Role.ADMIN);

  const [studentCount, classCount, invoicesResult, atRiskResult, unreadResult] =
    await Promise.all([
      db.studentProfile.count(),
      db.class.count(),
      getInvoicesAdmin(),
      getAtRiskStudents(),
      getUnreadCount(),
    ]);

  const invoices = invoicesResult.success
    ? (invoicesResult.data as { status: string }[])
    : [];
  const pendingFees = invoices.filter((inv) => inv.status === "PENDING").length;

  const atRisk = atRiskResult.success
    ? (atRiskResult.data as AtRiskRow[])
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Overview of school operations and key metrics."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students" value={studentCount} icon={Users} accent="violet" />
        <StatCard title="Classes" value={classCount} icon={School} accent="emerald" />
        <StatCard title="Pending Fees" value={pendingFees} icon={Wallet} accent="amber" />
        <StatCard
          title="At-Risk Students"
          value={atRisk.length}
          icon={AlertTriangle}
          accent="rose"
        />
      </div>

      {unreadResult.success && unreadResult.data.count > 0 && (
        <Card>
          <CardContent className="py-4 text-sm">
            You have{" "}
            <Badge variant="secondary">{unreadResult.data.count}</Badge> unread
            notifications.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">At-risk students</CardTitle>
        </CardHeader>
        <CardContent>
          {atRisk.length > 0 ? (
            <AtRiskTable data={atRisk} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No at-risk students identified.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
