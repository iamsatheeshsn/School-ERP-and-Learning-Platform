"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TeacherExam = {
  id: string;
  name: string;
  type: string;
  term: string;
  examDate: string | Date;
  maxMarks: number;
  status: string;
  class: { name: string };
  subject: { name: string };
};

type TeacherExamsListProps = {
  exams: TeacherExam[];
};

export function TeacherExamsList({ exams }: TeacherExamsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Your exams</CardTitle>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No exams scheduled for your classes yet.
          </p>
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
                      <Badge variant={exam.status === "PUBLISHED" ? "default" : "secondary"}>
                        {exam.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {exam.status !== "PUBLISHED" ? (
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Enter marks
                        </Link>
                      ) : (
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          View results
                        </Link>
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
  );
}
