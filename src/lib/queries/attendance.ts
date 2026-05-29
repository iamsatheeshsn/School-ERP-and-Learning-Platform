import { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const ATTENDANCE_THRESHOLD_PCT = 75;
export const CONSECUTIVE_ABSENCE_THRESHOLD = 3;

export type AttendanceThresholdFlags = {
  studentId: string;
  attendancePct: number;
  consecutiveAbsences: number;
  lowAttendance: boolean;
  consecutiveAbsenceFlag: boolean;
  flagged: boolean;
};

export async function checkAttendanceThresholdFlags(
  studentId: string,
  lookbackDays = 30
): Promise<AttendanceThresholdFlags> {
  const from = new Date();
  from.setDate(from.getDate() - lookbackDays);
  from.setHours(0, 0, 0, 0);

  const records = await db.attendance.findMany({
    where: { studentId, date: { gte: from } },
    orderBy: { date: "desc" },
  });

  const total = records.length;
  const presentCount = records.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
  ).length;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : 100;

  let consecutiveAbsences = 0;
  for (const record of records) {
    if (record.status === AttendanceStatus.ABSENT) {
      consecutiveAbsences++;
    } else {
      break;
    }
  }

  const lowAttendance = attendancePct < ATTENDANCE_THRESHOLD_PCT;
  const consecutiveAbsenceFlag = consecutiveAbsences >= CONSECUTIVE_ABSENCE_THRESHOLD;

  return {
    studentId,
    attendancePct,
    consecutiveAbsences,
    lowAttendance,
    consecutiveAbsenceFlag,
    flagged: lowAttendance || consecutiveAbsenceFlag,
  };
}
