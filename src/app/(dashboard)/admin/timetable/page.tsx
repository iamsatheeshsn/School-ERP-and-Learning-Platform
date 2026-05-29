import { Role } from "@prisma/client";
import { TimetableManager } from "@/components/dashboard/admin/timetable-manager";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminTimetablePage() {
  await requireRole(Role.ADMIN);

  const [classes, subjects, teachers, periods] = await Promise.all([
    db.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.teacherProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.timetablePeriod.findMany({
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description="Manage class periods, subjects, teachers, and rooms."
      />
      <TimetableManager
        classes={classes}
        subjects={subjects}
        teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
        periods={periods.map((p) => ({
          id: p.id,
          classId: p.classId,
          className: p.class.name,
          subjectName: p.subject.name,
          teacherName: p.teacher.user.name,
          dayOfWeek: p.dayOfWeek,
          startTime: p.startTime,
          endTime: p.endTime,
          room: p.room,
        }))}
      />
    </div>
  );
}
