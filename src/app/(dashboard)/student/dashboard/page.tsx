import { Role } from "@prisma/client";
import { Award, BookOpen, ClipboardCheck } from "lucide-react";
import { getStudentAnalytics } from "@/actions/analytics";
import { getHomeworkForStudent } from "@/actions/homework";
import { getUnreadCount } from "@/actions/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentDashboardPage() {
  const user = await requireRole(Role.STUDENT);
  if (!user.studentProfileId) {
    return <p className="text-muted-foreground">Student profile not found.</p>;
  }

  const [analyticsResult, homeworkResult, unreadResult] = await Promise.all([
    getStudentAnalytics({ studentId: user.studentProfileId }),
    getHomeworkForStudent(),
    getUnreadCount(),
  ]);

  const analytics = analyticsResult.success ? analyticsResult.data : null;
  const submissions = homeworkResult.success
    ? (homeworkResult.data as { status: string }[])
    : [];
  const pendingHomework = submissions.filter((sub) => sub.status === "PENDING").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]}!`}
        description="Your learning dashboard."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Attendance"
          value={analytics ? `${analytics.attendance.attendancePct}%` : "—"}
          icon={ClipboardCheck}
          accent="emerald"
        />
        <StatCard
          title="Homework Done"
          value={
            analytics
              ? `${analytics.homework.completed}/${analytics.homework.total}`
              : "—"
          }
          icon={BookOpen}
          accent="sky"
        />
        <StatCard
          title="Average Grade"
          value={analytics ? `${analytics.averageGrade}%` : "—"}
          icon={Award}
          accent="fuchsia"
        />
        <StatCard title="Due Homework" value={pendingHomework} icon={BookOpen} accent="amber" />
      </div>

      {unreadResult.success && unreadResult.data.count > 0 && (
        <Card>
          <CardContent className="py-4 text-sm">
            {unreadResult.data.count} unread notification
            {unreadResult.data.count !== 1 ? "s" : ""}.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
