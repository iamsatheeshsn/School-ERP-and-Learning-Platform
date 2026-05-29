import { Role } from "@prisma/client";
import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { getInvoicesAdmin } from "@/actions/fees";
import { FeesManager } from "@/components/dashboard/admin/fees-manager";
import { InvoicesTable, type InvoiceRow } from "@/components/dashboard/admin/invoices-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminFeesPage() {
  await requireRole(Role.ADMIN);

  const [invoicesResult, classes, feeStructures] = await Promise.all([
    getInvoicesAdmin(),
    db.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.feeStructure.findMany({
      include: { class: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const invoices = invoicesResult.success
    ? (invoicesResult.data as {
        status: string;
        amount: number;
        id: string;
        dueDate: string | Date;
        student: { user: { name: string }; class: { name: string } };
      }[])
    : [];
  const paid = invoices.filter((inv) => inv.status === "PAID").length;
  const pending = invoices.filter((inv) => inv.status === "PENDING").length;
  const totalCollected = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const rows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    student: inv.student.user.name,
    className: inv.student.class.name,
    amount: inv.amount,
    status: inv.status,
    dueDate: format(new Date(inv.dueDate), "MMM d, yyyy"),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fee Management"
        description="Create fee structures, generate invoices, and track collections."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Paid Invoices" value={paid} icon={Wallet} accent="emerald" />
        <StatCard title="Pending Invoices" value={pending} icon={Wallet} accent="amber" />
        <StatCard
          title="Total Collected"
          value={`₹${totalCollected.toLocaleString()}`}
          icon={Wallet}
          accent="violet"
        />
      </div>

      <FeesManager
        classes={classes}
        feeStructures={feeStructures.map((s) => ({
          id: s.id,
          name: s.name,
          totalAmount: s.totalAmount,
          class: s.class,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No invoices yet"
          description="Create a fee structure and generate invoices for students."
        />
      ) : (
        <InvoicesTable data={rows} />
      )}
    </div>
  );
}
