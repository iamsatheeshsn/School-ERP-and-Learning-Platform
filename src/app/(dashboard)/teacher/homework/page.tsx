import { Role } from "@prisma/client";
import { BookOpen } from "lucide-react";
import { getHomeworkByClass } from "@/actions/homework";
import { HomeworkManager } from "@/components/dashboard/teacher/homework-manager";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { getTeacherClassIds } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherHomeworkPage() {
  const user = await requireRole(Role.TEACHER);
  if (!user.teacherProfileId) {
    return <p className="text-muted-foreground">Teacher profile not found.</p>;
  }

  const classIds = await getTeacherClassIds(user.teacherProfileId);
  const [classes, subjects] = await Promise.all([
    db.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.teacherSubject.findMany({
      where: { teacherId: user.teacherProfileId },
      include: { subject: { select: { id: true, name: true } } },
    }),
  ]);

  const homeworkResults = await Promise.all(
    classIds.map((id) => getHomeworkByClass(id))
  );

  const homework = homeworkResults
    .filter((r) => r.success)
    .flatMap((r) => r.data as object[])
    .sort(
      (a, b) =>
        new Date((b as { dueDate: string }).dueDate).getTime() -
        new Date((a as { dueDate: string }).dueDate).getTime()
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        description="Create assignments, generate AI worksheets, and track submissions."
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes assigned"
          description="Contact your admin to be assigned to a class."
        />
      ) : (
        <HomeworkManager
          homework={homework as Parameters<typeof HomeworkManager>[0]["homework"]}
          classes={classes}
          subjects={subjects.map((s) => s.subject)}
        />
      )}
    </div>
  );
}
