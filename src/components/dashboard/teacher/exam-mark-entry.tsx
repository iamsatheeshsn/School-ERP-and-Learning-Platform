"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveExamResults } from "@/actions/exams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExamMarkEntryProps = {
  examId: string;
  examName: string;
  className: string;
  subjectName: string;
  maxMarks: number;
  status: string;
  students: { id: string; rollNo: string; name: string }[];
  initialMarks: Record<string, number>;
};

export function ExamMarkEntry({
  examId,
  examName,
  className,
  subjectName,
  maxMarks,
  status,
  students,
  initialMarks,
}: ExamMarkEntryProps) {
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      students.map((s) => [s.id, initialMarks[s.id]?.toString() ?? ""])
    )
  );
  const [isPending, startTransition] = useTransition();
  const readOnly = status === "PUBLISHED";

  const filledCount = useMemo(
    () => students.filter((s) => marks[s.id]?.trim()).length,
    [students, marks]
  );

  function handleSaveAll() {
    const results = students
      .map((s) => ({
        studentId: s.id,
        marks: parseFloat(marks[s.id] ?? ""),
      }))
      .filter((r) => !Number.isNaN(r.marks));

    if (results.length === 0) {
      toast.error("Enter at least one mark");
      return;
    }

    startTransition(async () => {
      const result = await saveExamResults({ examId, results });
      if (result.success) {
        toast.success(`Saved marks for ${result.data.saved} students`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-lg">{examName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {className} · {subjectName} · Max {maxMarks} marks
          </p>
        </div>
        <Badge variant={status === "PUBLISHED" ? "default" : "secondary"}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Marks / {maxMarks}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.rollNo}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max={maxMarks}
                      className="w-24"
                      value={marks[student.id] ?? ""}
                      onChange={(e) =>
                        setMarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                      }
                      disabled={readOnly || isPending}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!readOnly && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filledCount} of {students.length} students marked
            </p>
            <Button onClick={handleSaveAll} disabled={isPending}>
              {isPending ? "Saving..." : "Save all marks"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
