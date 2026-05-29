import { Role } from "@prisma/client";
import Link from "next/link";
import { Users } from "lucide-react";
import { StudentsAdminPanel } from "@/components/dashboard/admin/students-admin-panel";
import type { StudentRow } from "@/components/dashboard/admin/students-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminStudentsPage() {
  await requireRole(Role.ADMIN);

  const [students, classes] = await Promise.all([
    db.studentProfile.findMany({
      include: {
        user: { select: { name: true, email: true } },
        class: { select: { id: true, name: true, grade: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { rollNo: "asc" }],
    }),
    db.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: StudentRow[] = students.map((s) => ({
    id: s.id,
    classId: s.class.id,
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
          <Link
            href="/admin/users?tab=students"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Add student
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Register students from the Users section."
          action={
            <Link
              href="/admin/users?tab=students"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Go to Users
            </Link>
          }
        />
      ) : (
        <StudentsAdminPanel students={rows} classes={classes} />
      )}
    </div>
  );
}
