import { Role } from "@prisma/client";
import { Award } from "lucide-react";
import { getStudentAnalytics } from "@/actions/analytics";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentGradesPage() {
  const user = await requireRole(Role.STUDENT);
  if (!user.studentProfileId) {
    return <p className="text-muted-foreground">Student profile not found.</p>;
  }

  const result = await getStudentAnalytics({
    studentId: user.studentProfileId,
  });

  if (!result.success) {
    return <p className="text-muted-foreground">{result.error}</p>;
  }

  const { grades, averageGrade } = result.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Grades"
        description={`Average: ${averageGrade}% across all subjects`}
      />

      {grades.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No grades yet"
          description="Grades will appear here once teachers enter them."
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => (
                    <TableRow key={g.subject}>
                      <TableCell>{g.subject}</TableCell>
                      <TableCell>
                        {g.score} / {g.maxScore}
                      </TableCell>
                      <TableCell>
                        {Math.round((g.score / g.maxScore) * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
