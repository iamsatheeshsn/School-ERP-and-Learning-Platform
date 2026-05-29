import { Role } from "@prisma/client";
import { getAuditLogs } from "@/actions/audit";
import { AuditLogTable, type AuditLogRow } from "@/components/dashboard/admin/audit-log-table";
import { PageHeader } from "@/components/shared/page-header";

export default async function AdminAuditLogPage() {
  const result = await getAuditLogs(200);
  const logs: AuditLogRow[] = result.success
    ? result.data.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Track who changed students, classes, imports, and other master data."
      />
      <AuditLogTable data={logs} />
    </div>
  );
}
