import { Role } from "@prisma/client";
import { MessageSquare } from "lucide-react";
import { getThreads } from "@/actions/messages";
import { ParentMessagesPanel } from "@/components/dashboard/parent/messages-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentMessagesPage() {
  const user = await requireRole(Role.PARENT);

  const threadsResult = await getThreads();
  const threads = threadsResult.success ? threadsResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Communicate with your children's teachers."
      />

      {!threadsResult.success || (threads as unknown[]).length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations"
          description="Message threads with teachers will appear here."
        />
      ) : (
        <ParentMessagesPanel
          threads={threads as Parameters<typeof ParentMessagesPanel>[0]["threads"]}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
