import { Role } from "@/lib/types/enums";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { getReportCardsForStudent } from "@/actions/report-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentReportCardsPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);

  const reportCardsByChild = await Promise.all(
    children.map(async (child) => {
      const result = await getReportCardsForStudent(child.id);
      return { child, result };
    })
  );

  const hasFetchError = reportCardsByChild.some(({ result }) => !result.success);
  const hasCards = reportCardsByChild.some(
    ({ result }) => result.success && result.data.length > 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="View published report cards for your children."
      />

      {children.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No children linked"
          description="Link your account to view report cards."
        />
      ) : hasFetchError ? (
        reportCardsByChild.map(({ child, result }) =>
          !result.success ? (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="font-heading text-lg">{child.user.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{result.error}</p>
              </CardContent>
            </Card>
          ) : null
        )
      ) : !hasCards ? (
        <EmptyState
          icon={FileText}
          title="No report cards yet"
          description="Published report cards will appear here when teachers release them."
        />
      ) : (
        reportCardsByChild.map(({ child, result }) =>
          result.success && result.data.length > 0 ? (
            <div key={child.id} className="space-y-3">
              <h2 className="font-heading text-lg font-semibold">
                {child.user.name}
              </h2>
              {(result.data as {
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
                      <CardTitle className="text-base">
                        {rc.term} — {rc.academicYear.name}
                      </CardTitle>
                      {rc.publishedAt && (
                        <p className="text-sm text-muted-foreground">
                          Published{" "}
                          {format(new Date(rc.publishedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">{rc.status}</Badge>
                  </CardHeader>
                  {rc.aiSummary && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {rc.aiSummary}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : null
        )
      )}
    </div>
  );
}
