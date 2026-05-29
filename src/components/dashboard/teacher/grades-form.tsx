"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertGrade } from "@/actions/grades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type GradesFormProps = {
  students: { id: string; rollNo: string; name: string; classId: string }[];
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  existingGrades: Record<string, number>;
};

export function GradesForm({
  students,
  subjects,
  classes,
  existingGrades,
}: GradesFormProps) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [term, setTerm] = useState("Term 1");
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      students.map((s) => {
        const key = `${s.id}-${subjectId}-${term}`;
        return [s.id, existingGrades[key]?.toString() ?? ""];
      })
    )
  );
  const [isPending, startTransition] = useTransition();

  const classStudents = students.filter((s) => s.classId === classId);

  function handleSave(studentId: string) {
    const score = parseFloat(scores[studentId] ?? "");
    if (Number.isNaN(score)) {
      toast.error("Enter a valid score");
      return;
    }
    startTransition(async () => {
      const result = await upsertGrade({
        studentId,
        subjectId,
        term,
        score,
      });
      if (result.success) {
        toast.success("Grade saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Grade entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
              <SelectTrigger>
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
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="term">Term</Label>
            <Input
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Score / 100</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.rollNo}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="w-24"
                      value={scores[student.id] ?? ""}
                      onChange={(e) =>
                        setScores((s) => ({
                          ...s,
                          [student.id]: e.target.value,
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(student.id)}
                      disabled={isPending}
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
