import { Role } from "@prisma/client";
import { format } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { getAttendanceByClassAndDate } from "@/actions/attendance";
import { AttendanceGrid } from "@/components/dashboard/teacher/attendance-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { getTeacherClassIds } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function TeacherAttendancePage() {
  const user = await requireRole(Role.TEACHER);
  if (!user.teacherProfileId) {
    return <p className="text-muted-foreground">Teacher profile not found.</p>;
  }

  const classIds = await getTeacherClassIds(user.teacherProfileId);
  const today = format(new Date(), "yyyy-MM-dd");

  const classes = await db.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const initialClassId = classes[0]?.id ?? "";

  const [students, attendanceResult] = await Promise.all([
    initialClassId
      ? db.studentProfile.findMany({
          where: { classId: initialClassId },
          include: { user: { select: { name: true } } },
          orderBy: { rollNo: "asc" },
        })
      : Promise.resolve([]),
    initialClassId
      ? getAttendanceByClassAndDate({ classId: initialClassId, date: today })
      : Promise.resolve({ success: false as const, error: "" }),
  ]);

  const initialRecords =
    attendanceResult.success
      ? (attendanceResult.data as { studentId: string; status: import("@prisma/client").AttendanceStatus }[]).map(
          (r) => ({ studentId: r.studentId, status: r.status })
        )
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark daily attendance with bulk P / A / L / E controls."
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No classes assigned"
          description="Contact your admin to be assigned to a class."
        />
      ) : (
        <AttendanceGrid
          classes={classes}
          students={students.map((s) => ({
            id: s.id,
            rollNo: s.rollNo,
            user: s.user,
          }))}
          initialRecords={initialRecords}
          initialClassId={initialClassId}
          initialDate={today}
        />
      )}
    </div>
  );
}
