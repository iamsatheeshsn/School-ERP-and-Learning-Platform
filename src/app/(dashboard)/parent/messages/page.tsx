import { Role } from "@/lib/types/enums";
import { getThreads } from "@/actions/messages";
import { ParentMessagesPanel } from "@/components/dashboard/parent/messages-panel";
import { PageHeader } from "@/components/shared/page-header";
import { getParentMessageContacts } from "@/lib/queries/messages";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentMessagesPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return (
      <p className="text-muted-foreground">Parent profile not found.</p>
    );
  }

  const [threadsResult, contacts] = await Promise.all([
    getThreads(),
    getParentMessageContacts(user.parentProfileId),
  ]);

  const threads = threadsResult.success ? threadsResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Communicate with your children's teachers."
      />

      {!threadsResult.success && (
        <p className="text-sm text-destructive">{threadsResult.error}</p>
      )}

      <ParentMessagesPanel
        threads={threads as Parameters<typeof ParentMessagesPanel>[0]["threads"]}
        contacts={contacts}
        currentUserId={user.id}
      />
    </div>
  );
}
