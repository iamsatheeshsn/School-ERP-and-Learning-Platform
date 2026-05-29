import { Role } from "@prisma/client";
import { Award } from "lucide-react";
import { getTeacherGradeContext } from "@/actions/grades";
import { GradesForm } from "@/components/dashboard/teacher/grades-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherGradesPage() {
  await requireRole(Role.TEACHER);

  const contextResult = await getTeacherGradeContext();

  if (!contextResult.success) {
    return (
      <p className="text-muted-foreground">{contextResult.error}</p>
    );
  }

  const { classes, subjects, students } = contextResult.data;

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grades" description="Enter and update student grades." />
        <EmptyState
          icon={Award}
          title="No classes assigned"
          description="Contact your admin to be assigned to a class."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades"
        description="Enter and update student grades by class and subject."
      />
      <GradesForm
        classes={classes}
        subjects={subjects}
        students={students}
        existingGrades={{}}
      />
    </div>
  );
}
