"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

export type InvoiceRow = {
  id: string;
  student: string;
  className: string;
  amount: number;
  status: string;
  dueDate: string;
};

const columns: ColumnDef<InvoiceRow>[] = [
  { accessorKey: "student", header: "Student" },
  { accessorKey: "className", header: "Class" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `₹${row.original.amount.toLocaleString()}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "PAID" ? "default" : "secondary"}
      >
        {row.original.status}
      </Badge>
    ),
  },
  { accessorKey: "dueDate", header: "Due Date" },
];

type InvoicesTableProps = {
  data: InvoiceRow[];
};

export function InvoicesTable({ data }: InvoicesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="student"
      searchPlaceholder="Search by student..."
      pageSize={15}
    />
  );
}
