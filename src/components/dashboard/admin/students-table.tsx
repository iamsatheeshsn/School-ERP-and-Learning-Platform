"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

export type StudentRow = {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  className: string;
  grade: number;
};

const columns: ColumnDef<StudentRow>[] = [
  { accessorKey: "rollNo", header: "Roll No" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "className",
    header: "Class",
    cell: ({ row }) => (
      <Badge variant="secondary">
        Grade {row.original.grade} · {row.original.className}
      </Badge>
    ),
  },
];

type StudentsTableProps = {
  data: StudentRow[];
};

export function StudentsTable({ data }: StudentsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search students..."
    />
  );
}
