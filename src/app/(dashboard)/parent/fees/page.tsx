import { Role } from "@prisma/client";
import { Wallet } from "lucide-react";
import { getInvoicesForParent } from "@/actions/fees";
import { ParentFeesPanel } from "@/components/dashboard/parent/fees-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentFeesPage() {
  await requireRole(Role.PARENT);

  const result = await getInvoicesForParent();
  const invoices = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Invoices"
        description="View and pay school fee invoices."
      />

      {!result.success ? (
        <p className="text-muted-foreground">{result.error}</p>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No invoices"
          description="Fee invoices will appear here when the school generates them."
        />
      ) : (
        <ParentFeesPanel
          invoices={invoices as Parameters<typeof ParentFeesPanel>[0]["invoices"]}
        />
      )}
    </div>
  );
}
