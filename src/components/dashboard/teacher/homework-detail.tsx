"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { gradeSubmission } from "@/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Submission = {
  id: string;
  status: string;
  content: string | null;
  grade: number | null;
  maxGrade: number;
  submittedAt: string | Date | null;
  student: {
    rollNo: string;
    user: { name: string };
  };
};

type HomeworkDetailProps = {
  homework: {
    id: string;
    title: string;
    description: string;
    dueDate: string | Date;
    subject: { name: string };
    class: { name: string };
  };
  submissions: Submission[];
};

export function HomeworkDetailPanel({
  homework,
  submissions,
}: HomeworkDetailProps) {
  const [grades, setGrades] = useState<Record<string, string>>(
    Object.fromEntries(
      submissions.map((s) => [s.id, s.grade?.toString() ?? ""])
    )
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleGrade(submissionId: string) {
    const grade = parseFloat(grades[submissionId] ?? "");
    if (Number.isNaN(grade)) {
      toast.error("Enter a valid grade");
      return;
    }
    startTransition(async () => {
      const result = await gradeSubmission({
        submissionId,
        grade,
        teacherNotes: notes[submissionId],
      });
      if (result.success) {
        toast.success("Submission graded");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">{homework.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {homework.class.name} · {homework.subject.name} · Due{" "}
            {format(new Date(homework.dueDate), "MMM d, yyyy")}
          </p>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{homework.description}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Submissions</h2>
        {submissions.map((sub) => (
          <Card key={sub.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  {sub.student.user.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Roll {sub.student.rollNo}
                  {sub.submittedAt &&
                    ` · Submitted ${format(new Date(sub.submittedAt), "MMM d")}`}
                </p>
              </div>
              <Badge>{sub.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {sub.content ? (
                <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {sub.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No submission yet
                </p>
              )}
              {sub.status !== "PENDING" && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label>Grade / {sub.maxGrade}</Label>
                    <Input
                      type="number"
                      min="0"
                      max={sub.maxGrade}
                      className="w-24"
                      value={grades[sub.id] ?? ""}
                      onChange={(e) =>
                        setGrades((g) => ({ ...g, [sub.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="min-w-[200px] flex-1 space-y-1">
                    <Label>Notes</Label>
                    <Textarea
                      rows={1}
                      value={notes[sub.id] ?? ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [sub.id]: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleGrade(sub.id)}
                    disabled={isPending}
                  >
                    Save grade
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
