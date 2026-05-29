"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/dashboard/admin/users/entity-edit-dialog";

export type StudentRow = {
  id: string;
  userId?: string;
  classId?: string;
  rollNo: string;
  name: string;
  email: string;
  className: string;
  grade: number;
};

type StudentsTableProps = {
  data: StudentRow[];
  editable?: boolean;
  onEdit?: (student: StudentRow) => void;
  onDelete?: (student: StudentRow) => void;
};

export function StudentsTable({
  data,
  editable = false,
  onEdit,
  onDelete,
}: StudentsTableProps) {
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

  if (editable && onEdit && onDelete) {
    columns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          onEdit={() => onEdit(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search students..."
    />
  );
}
