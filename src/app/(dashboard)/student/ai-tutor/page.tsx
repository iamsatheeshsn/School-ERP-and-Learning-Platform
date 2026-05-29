import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getHomeworkForStudent } from "@/actions/homework";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/rbac/guards";

type HomeworkSubmission = {
  status: string;
  homework: {
    id: string;
    title: string;
    dueDate: string | Date;
    subject: { name: string };
  };
};

export default async function StudentAiTutorPage() {
  await requireRole(Role.STUDENT);
  const result = await getHomeworkForStudent();
  if (!result.success) redirect("/student/dashboard");

  const submissions = result.data as HomeworkSubmission[];
  const pending = submissions.filter(
    (s) => s.status === "PENDING" || s.status === "RETURNED"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Homework Tutor"
        description="Get Socratic guidance on your assignments — the tutor helps you learn, not cheat."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pending.length === 0 ? (
          <Card className="col-span-full rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending homework. Great job staying on top of your work!
            </CardContent>
          </Card>
        ) : (
          pending.map((sub) => (
            <Card
              key={sub.homework.id}
              className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {sub.homework.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {sub.homework.subject.name} · Due{" "}
                  {new Date(sub.homework.dueDate).toLocaleDateString()}
                </p>
                <Link
                  href={`/student/homework/${sub.homework.id}`}
                  className={cn(buttonVariants(), "w-full")}
                >
                  Open Tutor
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
