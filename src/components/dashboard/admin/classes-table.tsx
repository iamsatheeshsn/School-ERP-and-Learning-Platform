"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

export type ClassRow = {
  id: string;
  name: string;
  grade: number;
  section: string;
  academicYear: string;
  studentCount: number;
};

const columns: ColumnDef<ClassRow>[] = [
  { accessorKey: "name", header: "Class" },
  {
    accessorKey: "grade",
    header: "Grade",
    cell: ({ row }) => <Badge variant="outline">{row.original.grade}</Badge>,
  },
  { accessorKey: "section", header: "Section" },
  { accessorKey: "academicYear", header: "Academic Year" },
  { accessorKey: "studentCount", header: "Students" },
];

type ClassesTableProps = {
  data: ClassRow[];
};

export function ClassesTable({ data }: ClassesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search classes..."
    />
  );
}
