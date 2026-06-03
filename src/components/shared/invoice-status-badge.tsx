import { FeeInvoiceStatus } from "@/lib/types/enums";
import { Badge } from "@/components/ui/badge";

export function InvoiceStatusBadge({ status }: { status: string }) {
  const variant =
    status === FeeInvoiceStatus.PAID
      ? "default"
      : status === FeeInvoiceStatus.OVERDUE
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
