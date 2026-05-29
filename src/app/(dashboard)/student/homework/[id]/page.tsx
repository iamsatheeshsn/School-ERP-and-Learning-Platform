import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { StudentHomeworkDetail } from "@/components/dashboard/student/homework-detail";
import { Button, buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentHomeworkDetailPage({ params }: PageProps) {
  const user = await requireRole(Role.STUDENT);
  if (!user.studentProfileId) notFound();

  const { id } = await params;

  const submission = await db.homeworkSubmission.findUnique({
    where: {
      homeworkId_studentId: {
        homeworkId: id,
        studentId: user.studentProfileId,
      },
    },
    include: {
      homework: {
        include: { subject: { select: { name: true } } },
      },
    },
  });

  if (!submission) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/student/homework"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2" })}
      >
        <ArrowLeft className="size-4" />
        Back to homework
      </Link>
      <StudentHomeworkDetail
        homework={{
          id: submission.homework.id,
          title: submission.homework.title,
          description: submission.homework.description,
          dueDate: submission.homework.dueDate,
          subject: submission.homework.subject,
        }}
        submissionStatus={submission.status}
      />
    </div>
  );
}
