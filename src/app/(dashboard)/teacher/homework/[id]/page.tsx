import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { HomeworkDetailPanel } from "@/components/dashboard/teacher/homework-detail";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { assertTeacherCanAccessClass } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherHomeworkDetailPage({ params }: PageProps) {
  const user = await requireRole(Role.TEACHER);
  const { id } = await params;

  const homework = await db.homework.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true } },
      class: { select: { id: true, name: true } },
      submissions: {
        include: {
          student: {
            include: { user: { select: { name: true } } },
          },
        },
        orderBy: { student: { rollNo: "asc" } },
      },
    },
  });

  if (!homework) notFound();

  await assertTeacherCanAccessClass(user, homework.classId);

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/homework"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2" })}
      >
        <ArrowLeft className="size-4" />
        Back to homework
      </Link>
      <HomeworkDetailPanel
        homework={{
          id: homework.id,
          title: homework.title,
          description: homework.description,
          dueDate: homework.dueDate,
          subject: homework.subject,
          class: homework.class,
        }}
        submissions={homework.submissions.map((s) => ({
          id: s.id,
          status: s.status,
          content: s.content,
          grade: s.grade,
          maxGrade: s.maxGrade,
          submittedAt: s.submittedAt,
          student: {
            rollNo: s.student.rollNo,
            user: s.student.user,
          },
        }))}
      />
    </div>
  );
}
