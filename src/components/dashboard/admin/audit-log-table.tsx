"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

export type AuditLogRow = {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  summary: string;
  createdAt: string;
};

const columns: ColumnDef<AuditLogRow>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy HH:mm"),
  },
  { accessorKey: "actorName", header: "User" },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <Badge variant="secondary">{row.original.action}</Badge>,
  },
  { accessorKey: "entity", header: "Entity" },
  { accessorKey: "summary", header: "Summary" },
];

export function AuditLogTable({ data }: { data: AuditLogRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="summary"
      searchPlaceholder="Search audit log..."
      pageSize={15}
    />
  );
}
