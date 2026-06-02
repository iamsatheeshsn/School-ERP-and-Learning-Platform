"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LeaveStatus } from "@/lib/types/enums";
import { reviewLeaveRequest } from "@/actions/leave";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LeaveRow = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  type: string;
  reason: string;
  status: string;
  teacher: { user: { name: string; email: string } };
};

export function LeaveApprovalPanel({ requests }: { requests: LeaveRow[] }) {
  const [isPending, startTransition] = useTransition();

  function handleReview(leaveId: string, status: LeaveStatus.APPROVED | LeaveStatus.REJECTED) {
    startTransition(async () => {
      const result = await reviewLeaveRequest({ leaveId, status });
      if (result.success) toast.success(`Leave ${status.toLowerCase()}`);
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Leave requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests.</p>
        ) : (
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.teacher.user.name}</div>
                      <div className="text-xs text-muted-foreground">{req.reason}</div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(req.startDate), "MMM d")} –{" "}
                      {format(new Date(req.endDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{req.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          req.status === LeaveStatus.APPROVED
                            ? "default"
                            : req.status === LeaveStatus.REJECTED
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {req.status === LeaveStatus.PENDING && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleReview(req.id, LeaveStatus.APPROVED)}
                            disabled={isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(req.id, LeaveStatus.REJECTED)}
                            disabled={isPending}
                          >
                            Reject
                          </Button>
                        </>
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
