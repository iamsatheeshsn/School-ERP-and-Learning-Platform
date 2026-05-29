import { Role } from "@prisma/client";
import { BarChart3 } from "lucide-react";
import {
  generateClassInsights,
  getClassAnalytics,
} from "@/actions/analytics";
import { AnalyticsCharts } from "@/components/dashboard/admin/analytics-charts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminAnalyticsPage() {
  await requireRole(Role.ADMIN);

  const classes = await db.class.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Class performance insights and trends."
        />
        <EmptyState
          icon={BarChart3}
          title="No data available"
          description="Add classes and student data to view analytics."
        />
      </div>
    );
  }

  const analyticsResults = await Promise.all(
    classes.map(async (c) => {
      const result = await getClassAnalytics({ classId: c.id });
      return {
        name: c.name,
        id: c.id,
        data: result.success ? result.data : null,
      };
    })
  );

  const chartData = analyticsResults
    .filter((r) => r.data)
    .map((r) => ({
      name: r.name,
      attendance: r.data!.averageAttendancePct,
      homework: r.data!.averageHomeworkCompletionPct,
      grades: r.data!.averageGrade,
    }));

  const firstClass = classes[0];
  const insightsResult = firstClass
    ? await generateClassInsights({ classId: firstClass.id })
    : null;

  const aggregate = analyticsResults.reduce(
    (acc, r) => {
      if (!r.data) return acc;
      acc.students += r.data.studentCount;
      acc.atRisk += r.data.atRiskCount;
      return acc;
    },
    { students: 0, atRisk: 0 }
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Class performance insights and cohort trends."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Total Students (all classes)"
          value={aggregate.students}
          icon={BarChart3}
          accent="violet"
        />
        <StatCard
          title="At-Risk (all classes)"
          value={aggregate.atRisk}
          icon={BarChart3}
          accent="rose"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Class comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <AnalyticsCharts data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No analytics data to chart yet.
            </p>
          )}
        </CardContent>
      </Card>

      {insightsResult?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              AI insights — {firstClass.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
              {JSON.stringify(insightsResult.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
