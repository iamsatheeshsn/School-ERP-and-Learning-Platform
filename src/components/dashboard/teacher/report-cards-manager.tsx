"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  generateReportCard,
  publishReportCard,
} from "@/actions/report-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportCardItem = {
  id: string;
  term: string;
  status: string;
  publishedAt: string | Date | null;
  aiSummary: string | null;
  student: { user: { name: string }; rollNo: string };
  academicYear: { id: string; name: string };
};

type ReportCardsManagerProps = {
  reportCards: ReportCardItem[];
  students: { id: string; name: string; rollNo: string }[];
  academicYears: { id: string; name: string }[];
};

export function ReportCardsManager({
  reportCards,
  students,
  academicYears,
}: ReportCardsManagerProps) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(
    academicYears[0]?.id ?? ""
  );
  const [term, setTerm] = useState("Term 1");
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!studentId || !academicYearId) return;
    startTransition(async () => {
      const result = await generateReportCard({
        studentId,
        academicYearId,
        term,
      });
      if (result.success) {
        toast.success("Report card generated");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handlePublish(id: string) {
    startTransition(async () => {
      const result = await publishReportCard({ id });
      if (result.success) {
        toast.success("Report card published");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Generate report card
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Select value={studentId} onValueChange={(v) => v && setStudentId(v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.rollNo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={academicYearId} onValueChange={(v) => v && setAcademicYearId(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={term} onValueChange={(v) => v && setTerm(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Term 1">Term 1</SelectItem>
              <SelectItem value="Term 2">Term 2</SelectItem>
              <SelectItem value="Final">Final</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={isPending}>
            Generate with AI
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {reportCards.map((rc) => (
          <Card key={rc.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  {rc.student.user.name} — {rc.term}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {rc.academicYear.name}
                  {rc.publishedAt &&
                    ` · Published ${format(new Date(rc.publishedAt), "MMM d, yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    rc.status === "PUBLISHED" ? "default" : "secondary"
                  }
                >
                  {rc.status}
                </Badge>
                {rc.status !== "PUBLISHED" && (
                  <Button
                    size="sm"
                    onClick={() => handlePublish(rc.id)}
                    disabled={isPending}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </CardHeader>
            {rc.aiSummary && (
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {rc.aiSummary}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
