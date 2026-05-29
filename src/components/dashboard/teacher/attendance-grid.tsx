"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AttendanceStatus } from "@prisma/client";
import { markAttendance } from "@/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Student = {
  id: string;
  rollNo: string;
  user: { name: string };
};

type AttendanceRecord = {
  studentId: string;
  status: AttendanceStatus;
};

type AttendanceGridProps = {
  classes: { id: string; name: string }[];
  students: Student[];
  initialRecords: AttendanceRecord[];
  initialClassId: string;
  initialDate: string;
};

const STATUS_BUTTONS: {
  status: AttendanceStatus;
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}[] = [
  { status: AttendanceStatus.PRESENT, label: "P", variant: "default" },
  { status: AttendanceStatus.ABSENT, label: "A", variant: "destructive" },
  { status: AttendanceStatus.LATE, label: "L", variant: "secondary" },
  { status: AttendanceStatus.EXCUSED, label: "E", variant: "outline" },
];

export function AttendanceGrid({
  classes,
  students,
  initialRecords,
  initialClassId,
  initialDate,
}: AttendanceGridProps) {
  const [classId, setClassId] = useState(initialClassId);
  const [date, setDate] = useState(initialDate);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(
    () =>
      Object.fromEntries(
        initialRecords.map((r) => [r.studentId, r.status])
      )
  );
  const [isPending, startTransition] = useTransition();

  const filteredStudents = useMemo(
    () => students,
    [students]
  );

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function handleSave() {
    const records = filteredStudents.map((s) => ({
      studentId: s.id,
      status: statuses[s.id] ?? AttendanceStatus.PRESENT,
    }));
    startTransition(async () => {
      const result = await markAttendance({ classId, date, records });
      if (result.success) {
        toast.success(`Marked attendance for ${result.data.marked} students`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-heading text-lg">Mark attendance</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          />
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save all"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const current =
                  statuses[student.id] ?? AttendanceStatus.PRESENT;
                return (
                  <TableRow key={student.id}>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell>{student.user.name}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {STATUS_BUTTONS.map(({ status, label, variant }) => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            variant={
                              current === status ? variant : "outline"
                            }
                            className="size-8 p-0"
                            onClick={() => setStatus(student.id, status)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          P = Present · A = Absent · L = Late · E = Excused ·{" "}
          {format(new Date(date), "EEEE, MMM d, yyyy")}
        </p>
      </CardContent>
    </Card>
  );
}
