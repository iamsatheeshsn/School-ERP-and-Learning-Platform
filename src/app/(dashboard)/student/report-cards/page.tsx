import { Role } from "@prisma/client";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { getReportCardsForStudent } from "@/actions/report-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/rbac/guards";

export default async function StudentReportCardsPage() {
  await requireRole(Role.STUDENT);

  const result = await getReportCardsForStudent();
  const cards = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="View your published report cards."
      />

      {!result.success ? (
        <p className="text-muted-foreground">{result.error}</p>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No report cards yet"
          description="Published report cards will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {(cards as {
            id: string;
            term: string;
            status: string;
            publishedAt: string | Date | null;
            aiSummary: string | null;
            academicYear: { name: string };
          }[]).map((rc) => (
            <Card key={rc.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading text-lg">
                    {rc.term} — {rc.academicYear.name}
                  </CardTitle>
                  {rc.publishedAt && (
                    <p className="text-sm text-muted-foreground">
                      Published{" "}
                      {format(new Date(rc.publishedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <Badge>{rc.status}</Badge>
              </CardHeader>
              {rc.aiSummary && (
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {rc.aiSummary}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
