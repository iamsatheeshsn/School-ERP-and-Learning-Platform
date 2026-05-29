"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";

export type AtRiskRow = {
  studentId: string;
  name: string;
  rollNo: string;
  reasons: string[];
};

const columns: ColumnDef<AtRiskRow>[] = [
  { accessorKey: "rollNo", header: "Roll" },
  { accessorKey: "name", header: "Student" },
  {
    accessorKey: "reasons",
    header: "Reasons",
    cell: ({ row }) => (
      <ul className="list-inside list-disc text-sm text-muted-foreground">
        {row.original.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    ),
  },
];

type AtRiskTableProps = {
  data: AtRiskRow[];
};

export function AtRiskTable({ data }: AtRiskTableProps) {
  return <DataTable columns={columns} data={data} searchKey="name" />;
}
