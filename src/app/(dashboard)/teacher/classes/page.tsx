import { Role } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherClassesPage() {
  await requireRole(Role.TEACHER);
  const classes = await db.class.findMany({
    include: {
      academicYear: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes"
        description="Classes assigned to you this academic year."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Card key={cls.id} className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{cls.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {cls.academicYear.name} · {cls._count.students} students
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
