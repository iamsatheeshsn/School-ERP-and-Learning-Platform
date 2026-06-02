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

type Issue = {
  id: string;
  issuedAt: string | Date;
  dueAt: string | Date;
  returnedAt?: string | Date | null;
  status: string;
  fineAmount?: number;
  book: { title: string; author: string };
};

export function LibraryIssuesView({ title, issues }: { title: string; issues: Issue[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No library activity.</p>
        ) : (
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div className="font-medium">{issue.book.title}</div>
                      <div className="text-xs text-muted-foreground">{issue.book.author}</div>
                    </TableCell>
                    <TableCell>{format(new Date(issue.issuedAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(issue.dueAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={issue.status === "OVERDUE" ? "destructive" : "secondary"}>
                        {issue.status}
                        {issue.fineAmount ? ` · ₹${issue.fineAmount}` : ""}
                      </Badge>
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
