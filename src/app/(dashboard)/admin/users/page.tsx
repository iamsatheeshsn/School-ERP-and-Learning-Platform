import { Role } from "@prisma/client";
import Link from "next/link";
import { UsersManagement } from "@/components/dashboard/admin/users/users-management";
import type { StudentRow } from "@/components/dashboard/admin/students-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac/guards";

type AdminUsersPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole(Role.ADMIN);
  const { tab } = await searchParams;

  const school = await db.school.findFirst({
    select: { id: true },
  });

  if (!school) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Register students, teachers, parents, and manage master data."
        />
        <p className="text-sm text-muted-foreground">
          No school record found. Run the database seed or configure school settings first.
        </p>
      </div>
    );
  }

  const [
    classes,
    academicYears,
    studentProfiles,
    teachers,
    parentProfiles,
    subjects,
    classRecords,
    parentLinks,
  ] = await Promise.all([
    db.class.findMany({
      select: { id: true, name: true, grade: true, section: true },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    }),
    db.academicYear.findMany({
      select: { id: true, name: true, isCurrent: true },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    }),
    db.studentProfile.findMany({
      include: {
        user: { select: { name: true, email: true } },
        class: { select: { name: true, grade: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { rollNo: "asc" }],
    }),
    db.user.findMany({
      where: { role: Role.TEACHER },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.parentProfile.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.subject.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.class.findMany({
      include: {
        academicYear: { select: { name: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    }),
    db.parentStudent.findMany({
      include: {
        parent: { include: { user: { select: { name: true, email: true } } } },
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const students: StudentRow[] = studentProfiles.map((student) => ({
    id: student.id,
    rollNo: student.rollNo,
    name: student.user.name,
    email: student.user.email,
    className: student.class.name,
    grade: student.class.grade,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Register students, teachers, and parents. Manage classes, subjects, and family links."
        actions={
          <Button variant="outline" render={<Link href="/admin/students" />}>
            View students list
          </Button>
        }
      />

      <UsersManagement
        defaultTab={tab ?? "students"}
        schoolId={school.id}
        classes={classes}
        academicYears={academicYears}
        students={students}
        studentOptions={studentProfiles.map((student) => ({
          id: student.id,
          name: student.user.name,
          className: student.class.name,
          rollNo: student.rollNo,
        }))}
        parents={parentProfiles.map((parent) => ({
          id: parent.id,
          name: parent.user.name,
          email: parent.user.email,
        }))}
        parentRows={parentProfiles.map((parent) => ({
          id: parent.id,
          name: parent.user.name,
          email: parent.user.email,
          phone: parent.phone,
        }))}
        teacherRows={teachers}
        subjectRows={subjects}
        classRows={classRecords.map((cls) => ({
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          section: cls.section,
          academicYear: cls.academicYear.name,
          studentCount: cls._count.students,
        }))}
        parentLinks={parentLinks.map((link) => ({
          id: link.id,
          relation: link.relation,
          parentName: link.parent.user.name,
          parentEmail: link.parent.user.email,
          studentName: link.student.user.name,
          className: link.student.class.name,
        }))}
      />
    </div>
  );
}
