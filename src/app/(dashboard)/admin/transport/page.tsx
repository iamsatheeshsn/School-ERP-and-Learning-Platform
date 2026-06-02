import { Role } from "@/lib/types/enums";
import { getTransportContext, getTransportRoutesAdmin } from "@/actions/transport";
import { TransportManager } from "@/components/dashboard/admin/transport-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminTransportPage() {
  await requireRole(Role.ADMIN);

  const contextResult = await getTransportContext();
  const routesResult = await getTransportRoutesAdmin();

  if (!contextResult.success) {
    return <p className="text-muted-foreground">{contextResult.error}</p>;
  }

  const routes = routesResult.success
    ? (routesResult.data as Parameters<typeof TransportManager>[0]["routes"])
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transport"
        description="Manage bus routes, stops, and student assignments."
      />
      <TransportManager
        schoolId={contextResult.data.schoolId}
        routes={routes}
        students={contextResult.data.students}
      />
    </div>
  );
}
