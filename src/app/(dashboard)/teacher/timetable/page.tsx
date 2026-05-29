import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function TeacherTimetablePage() {
  const user = await requireRole(Role.TEACHER);
  if (!user.teacherProfileId) redirect("/teacher/dashboard");

  const periods = await db.timetablePeriod.findMany({
    where: { teacherId: user.teacherProfileId },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My timetable" description="Your weekly teaching schedule." />
      {periods.length === 0 ? (
        <p className="text-sm text-muted-foreground">No periods assigned yet.</p>
      ) : (
        <div className="grid gap-3">
          {periods.map((period) => (
            <Card key={period.id} className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {DAYS[period.dayOfWeek]} · {period.startTime}–{period.endTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {period.subject.name} · {period.class.name}
                    {period.room ? ` · Room ${period.room}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
