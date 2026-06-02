import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExamResultRow = {
  exam: {
    id: string;
    name: string;
    type: string;
    examDate: string | Date;
    maxMarks: number;
    showRanks?: boolean;
    subject?: { name: string };
  };
  result: {
    marks: number;
    percentage: number;
    gradeLetter: string;
    rank?: number | null;
  } | null;
};

type StudentExamResultsProps = {
  title: string;
  items: ExamResultRow[];
  showRanks?: boolean;
};

export function StudentExamResults({ title, items, showRanks = true }: StudentExamResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published exam results yet.</p>
        ) : (
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  {showRanks && <TableHead>Rank</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(({ exam, result }) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div className="font-medium">{exam.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(exam.examDate), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>{exam.subject?.name ?? "—"}</TableCell>
                    <TableCell>
                      {result ? (
                        <>
                          {result.marks} / {exam.maxMarks}
                          <span className="ml-2 text-muted-foreground">
                            ({result.percentage}%)
                          </span>
                        </>
                      ) : (
                        <Badge variant="secondary">Absent</Badge>
                      )}
                    </TableCell>
                    <TableCell>{result?.gradeLetter ?? "—"}</TableCell>
                    {showRanks && (
                      <TableCell>
                        {result?.rank && exam.showRanks !== false ? `#${result.rank}` : "—"}
                      </TableCell>
                    )}
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
