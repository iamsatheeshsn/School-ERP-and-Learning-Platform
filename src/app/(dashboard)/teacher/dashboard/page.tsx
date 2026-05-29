import { Role } from "@prisma/client";
import { BookOpen, ClipboardCheck, Users } from "lucide-react";
import { getAtRiskStudents } from "@/actions/analytics";
import { getUnreadCount } from "@/actions/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeacherClassIds, getTeacherStudents } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";
import { db } from "@/lib/db";

export default async function TeacherDashboardPage() {
  const user = await requireRole(Role.TEACHER);
  if (!user.teacherProfileId) {
    return <p className="text-muted-foreground">Teacher profile not found.</p>;
  }

  const classIds = await getTeacherClassIds(user.teacherProfileId);

  const [students, atRiskResult, unreadResult, homeworkCount] =
    await Promise.all([
      getTeacherStudents(user.teacherProfileId),
      getAtRiskStudents(),
      getUnreadCount(),
      db.homework.count({ where: { classId: { in: classIds } } }),
    ]);

  const atRisk = atRiskResult.success ? atRiskResult.data.length : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Your teaching dashboard at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="My Students" value={students.length} icon={Users} accent="violet" />
        <StatCard title="My Classes" value={classIds.length} icon={Users} accent="emerald" />
        <StatCard title="Active Homework" value={homeworkCount} icon={BookOpen} accent="sky" />
        <StatCard title="At-Risk Students" value={atRisk} icon={ClipboardCheck} accent="rose" />
      </div>

      {unreadResult.success && unreadResult.data.count > 0 && (
        <Card>
          <CardContent className="py-4 text-sm">
            {unreadResult.data.count} unread notification
            {unreadResult.data.count !== 1 ? "s" : ""}.
          </CardContent>
        </Card>
      )}

      {atRiskResult.success && atRiskResult.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Students needing attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {atRiskResult.data.slice(0, 5).map((s) => (
                <li key={s.studentId}>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {s.reasons[0]}
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
