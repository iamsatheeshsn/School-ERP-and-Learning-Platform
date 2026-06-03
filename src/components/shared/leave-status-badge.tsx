import { LeaveStatus } from "@/lib/types/enums";
import { Badge } from "@/components/ui/badge";

export function LeaveStatusBadge({ status }: { status: string }) {
  const variant =
    status === LeaveStatus.APPROVED
      ? "default"
      : status === LeaveStatus.REJECTED
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
