import { Role } from "@prisma/client";
import { MessageSquare } from "lucide-react";
import { getThreads } from "@/actions/messages";
import { MessagesPanel } from "@/components/dashboard/teacher/messages-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getTeacherStudents } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherMessagesPage() {
  const user = await requireRole(Role.TEACHER);
  if (!user.teacherProfileId) {
    return <p className="text-muted-foreground">Teacher profile not found.</p>;
  }

  const [threadsResult, students] = await Promise.all([
    getThreads(),
    getTeacherStudents(user.teacherProfileId),
  ]);

  const threads = threadsResult.success ? threadsResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Communicate with parents and use AI to draft updates."
      />

      {!threadsResult.success || (threads as unknown[]).length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No message threads"
          description="Threads appear when parents initiate conversations about their children."
        />
      ) : (
        <MessagesPanel
          threads={threads as Parameters<typeof MessagesPanel>[0]["threads"]}
          students={students.map((s) => ({
            id: s.id,
            name: s.user.name,
          }))}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
