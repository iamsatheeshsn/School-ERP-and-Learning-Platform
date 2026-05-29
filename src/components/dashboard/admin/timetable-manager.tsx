"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTimetablePeriod,
  deleteTimetablePeriod,
} from "@/actions/timetable";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PeriodRow = {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
};

type TimetableManagerProps = {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  periods: PeriodRow[];
};

export function TimetableManager({
  classes,
  subjects,
  teachers,
  periods,
}: TimetableManagerProps) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState("0");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [room, setRoom] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (classId ? periods.filter((p) => p.classId === classId) : periods),
    [periods, classId]
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createTimetablePeriod({
        classId,
        subjectId,
        teacherId,
        dayOfWeek: Number(dayOfWeek),
        startTime: startTime.slice(0, 5),
        endTime: endTime.slice(0, 5),
        room: room || undefined,
      });
      if (result.success) {
        toast.success("Period added");
        setRoom("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteTimetablePeriod({ id: deleteId });
      if (result.success) {
        toast.success("Period deleted");
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Add period</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Class">
              <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Teacher">
              <Select value={teacherId} onValueChange={(v) => v && setTeacherId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Day">
              <Select value={dayOfWeek} onValueChange={(v) => v && setDayOfWeek(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => (
                    <SelectItem key={day} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </Field>
            <Field label="End">
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </Field>
            <Field label="Room (optional)">
              <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room 101" />
            </Field>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={isPending}>Add period</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No periods for this class yet.</p>
          ) : (
            filtered.map((period) => (
              <div key={period.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {DAYS[period.dayOfWeek]} · {period.startTime}–{period.endTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {period.subjectName} · {period.teacherName}
                    {period.room ? ` · ${period.room}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{period.className}</Badge>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(period.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete period?"
        description="This will remove the timetable period."
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
