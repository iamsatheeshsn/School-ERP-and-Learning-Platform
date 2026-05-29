"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteStudent } from "@/actions/users";
import {
  EntityEditDialog,
  type EditTarget,
} from "@/components/dashboard/admin/users/entity-edit-dialog";
import {
  StudentsTable,
  type StudentRow,
} from "@/components/dashboard/admin/students-table";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

type StudentsAdminPanelProps = {
  students: StudentRow[];
  classes: { id: string; name: string }[];
};

export function StudentsAdminPanel({ students, classes }: StudentsAdminPanelProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteStudentRow, setDeleteStudentRow] = useState<StudentRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDeleteConfirm() {
    if (!deleteStudentRow) return;
    startDeleteTransition(async () => {
      const result = await deleteStudent({ studentProfileId: deleteStudentRow.id });
      if (result.success) {
        toast.success("Student deleted");
        setDeleteStudentRow(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <StudentsTable
        data={students}
        editable
        onEdit={(student) => {
          setEditTarget({
            kind: "student",
            userId: student.userId ?? "",
            studentProfileId: student.id,
            name: student.name,
            email: student.email,
            classId: student.classId ?? classes[0]?.id ?? "",
            rollNo: student.rollNo,
          });
          setEditOpen(true);
        }}
        onDelete={setDeleteStudentRow}
      />

      <EntityEditDialog
        target={editTarget}
        open={editOpen}
        onOpenChange={setEditOpen}
        classes={classes}
        schoolId=""
        onSaved={() => router.refresh()}
      />

      <ConfirmDeleteDialog
        open={!!deleteStudentRow}
        onOpenChange={(open) => !open && setDeleteStudentRow(null)}
        title="Delete student?"
        description={
          deleteStudentRow
            ? `This will permanently remove ${deleteStudentRow.name} and their profile. This cannot be undone.`
            : ""
        }
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
