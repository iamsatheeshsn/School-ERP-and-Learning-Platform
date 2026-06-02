import Link from "next/link";
import { Role, ExamStatus } from "@/lib/types/enums";
import { ArrowLeft } from "lucide-react";
import { getExamMarkEntry, getPublishedExamResults } from "@/actions/exams";
import { ExamMarkEntry } from "@/components/dashboard/teacher/exam-mark-entry";
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
import { requireRole } from "@/lib/rbac/guards";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherExamDetailPage({ params }: PageProps) {
  await requireRole(Role.TEACHER);
  const { id } = await params;

  const entryResult = await getExamMarkEntry(id);
  if (!entryResult.success) {
    return <p className="text-muted-foreground">{entryResult.error}</p>;
  }

  const { exam, students, results } = entryResult.data;

  if (exam.status === ExamStatus.PUBLISHED) {
    const publishedResult = await getPublishedExamResults(id);
    const published = publishedResult.success
      ? (publishedResult.data as {
          showRanks: boolean;
          results: Array<{
            marks: number;
            percentage: number;
            gradeLetter: string;
            rank: number | null;
            student: { rollNo: string; user: { name: string } };
          }>;
        })
      : null;

    return (
      <div className="space-y-6">
        <Link
          href="/teacher/exams"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2" })}
        >
          <ArrowLeft className="size-4" />
          Back to exams
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{exam.name} — Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                    {published?.showRanks && <TableHead>Rank</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(published?.results ?? []).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.student.rollNo}</TableCell>
                      <TableCell>{row.student.user.name}</TableCell>
                      <TableCell>
                        {row.marks} ({row.percentage}%)
                      </TableCell>
                      <TableCell>{row.gradeLetter}</TableCell>
                      {published?.showRanks && (
                        <TableCell>{row.rank ? `#${row.rank}` : "—"}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/exams"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2" })}
      >
        <ArrowLeft className="size-4" />
        Back to exams
      </Link>

      <ExamMarkEntry
        examId={id}
        examName={exam.name}
        className={exam.class.name}
        subjectName={exam.subject.name}
        maxMarks={exam.maxMarks}
        status={exam.status}
        students={students}
        initialMarks={results}
      />
    </div>
  );
}
