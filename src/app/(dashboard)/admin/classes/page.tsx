import { Role } from "@prisma/client";
import { School } from "lucide-react";
import { ClassesTable, type ClassRow } from "@/components/dashboard/admin/classes-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminClassesPage() {
  await requireRole(Role.ADMIN);

  const classes = await db.class.findMany({
    include: {
      academicYear: { select: { name: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
  });

  const rows: ClassRow[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    section: c.section,
    academicYear: c.academicYear.name,
    studentCount: c._count.students,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="View all classes across academic years."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={School}
          title="No classes yet"
          description="Classes will appear here once configured for the academic year."
        />
      ) : (
        <ClassesTable data={rows} />
      )}
    </div>
  );
}
