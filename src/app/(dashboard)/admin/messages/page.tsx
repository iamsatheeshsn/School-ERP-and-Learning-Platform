import { Role } from "@prisma/client";
import { MessageSquare } from "lucide-react";
import { BroadcastForm } from "@/components/dashboard/admin/broadcast-form";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminMessagesPage() {
  await requireRole(Role.ADMIN);

  const classes = await db.class.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages & Broadcasts"
        description="Send school-wide or class-specific announcements."
        actions={
          <MessageSquare className="size-5 text-muted-foreground" />
        }
      />
      <BroadcastForm classes={classes} />
    </div>
  );
}
