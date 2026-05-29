import { Role } from "@prisma/client";
import Link from "next/link";
import { Users } from "lucide-react";
import { StudentsTable, type StudentRow } from "@/components/dashboard/admin/students-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminStudentsPage() {
  await requireRole(Role.ADMIN);

  const students = await db.studentProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      class: { select: { name: true, grade: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { rollNo: "asc" }],
  });

  const rows: StudentRow[] = students.map((s) => ({
    id: s.id,
    rollNo: s.rollNo,
    name: s.user.name,
    email: s.user.email,
    className: s.class.name,
    grade: s.class.grade,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage and view all enrolled students."
        actions={
          <Button render={<Link href="/admin/users?tab=students" />}>
            Add student
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Register students from the Users section."
          action={
            <Button render={<Link href="/admin/users?tab=students" />}>
              Go to Users
            </Button>
          }
        />
      ) : (
        <StudentsTable data={rows} />
      )}
    </div>
  );
}
