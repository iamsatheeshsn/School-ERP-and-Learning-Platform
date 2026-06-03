"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ExamType } from "@/lib/types/enums";
import { ExamStatus } from "@/lib/types/enums";
import { createExam, publishExam } from "@/actions/exams";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExamRow = {
  id: string;
  name: string;
  type: string;
  term: string;
  examDate: string | Date;
  maxMarks: number;
  status: string;
  showRanks: boolean;
  class: { name: string };
  subject: { name: string };
};

type ExamsManagerProps = {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string; code: string }[];
  exams: ExamRow[];
};

const EXAM_TYPES = Object.values(ExamType);

export function ExamsManager({ classes, subjects, exams }: ExamsManagerProps) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [type, setType] = useState<ExamType>(ExamType.UNIT_TEST);
  const [term, setTerm] = useState("Term 1");
  const [examDate, setExamDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createExam({
        name,
        type,
        classId,
        subjectId,
        term,
        examDate,
        maxMarks: parseFloat(maxMarks),
        showRanks: true,
      });
      if (result.success) {
        toast.success("Exam scheduled");
        setName("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handlePublish(examId: string, examName: string) {
    if (
      !window.confirm(
        `Publish results for "${examName}"? Parents and students will be able to view marks.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await publishExam(examId);
      if (result.success) {
        toast.success(`Published results for ${result.data.published} students`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Schedule exam</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 || subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add classes and subjects before scheduling exams.
            </p>
          ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-name">Exam name</Label>
              <Input
                id="exam-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Midterm Mathematics"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => v && setType(v as ExamType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exam-date">Date</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-marks">Max marks</Label>
                <Input
                  id="max-marks"
                  type="number"
                  min="1"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Schedule exam"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Scheduled exams</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No exams scheduled"
              description="Schedule an exam to collect marks from teachers."
              className="py-10"
            />
          ) : (
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div className="font-medium">{exam.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {exam.subject.name} · {format(new Date(exam.examDate), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>{exam.class.name}</TableCell>
                      <TableCell>
                        <Badge variant={exam.status === ExamStatus.PUBLISHED ? "default" : "secondary"}>
                          {exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {exam.status !== ExamStatus.PUBLISHED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublish(exam.id, exam.name)}
                            disabled={isPending}
                          >
                            Publish
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
