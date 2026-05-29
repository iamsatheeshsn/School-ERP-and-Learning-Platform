import { Role } from "@prisma/client";
import { Baby } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getParentChildren } from "@/lib/queries/students";
import { requireRole } from "@/lib/rbac/guards";

export default async function ParentChildrenPage() {
  const user = await requireRole(Role.PARENT);
  if (!user.parentProfileId) {
    return <p className="text-muted-foreground">Parent profile not found.</p>;
  }

  const children = await getParentChildren(user.parentProfileId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Children"
        description="View your linked student profiles."
      />

      {children.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="No children linked"
          description="Contact the school admin to link your account to your children."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  {child.user.name}
                </CardTitle>
                <Badge variant="secondary">
                  Grade {child.class.grade} · {child.class.name}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Roll number: {child.rollNo}</p>
                <p>Email: {child.user.email}</p>
                <p>
                  Admitted:{" "}
                  {new Date(child.admissionDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
