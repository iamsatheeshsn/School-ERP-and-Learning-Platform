"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { createPaymentOrder, confirmPayment } from "@/actions/fees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  runStubPayment,
  useRazorpayCheckout,
} from "@/hooks/use-razorpay-checkout";

type Invoice = {
  id: string;
  amount: number;
  status: string;
  dueDate: string | Date;
  description: string | null;
  student: { user: { name: string } };
};

type ParentFeesPanelProps = {
  invoices: Invoice[];
};

export function ParentFeesPanel({ invoices }: ParentFeesPanelProps) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { openCheckout, isConfigured, loading: checkoutLoading } =
    useRazorpayCheckout();

  async function finalizePayment(
    invoiceId: string,
    orderId: string,
    paymentId: string,
    signature: string
  ) {
    const confirmResult = await confirmPayment({
      invoiceId,
      orderId,
      paymentId,
      signature,
    });

    if (confirmResult.success) {
      toast.success("Payment successful");
    } else {
      toast.error(confirmResult.error);
    }
    setPayingId(null);
  }

  function handlePay(invoice: Invoice) {
    setPayingId(invoice.id);
    startTransition(async () => {
      const orderResult = await createPaymentOrder({ invoiceId: invoice.id });
      if (!orderResult.success) {
        toast.error(orderResult.error);
        setPayingId(null);
        return;
      }

      const { orderId, amount, currency } = orderResult.data;
      const description = invoice.description ?? "School fee payment";

      if (isConfigured) {
        await openCheckout({
          orderId,
          amount,
          currency,
          description,
          onSuccess: async (response) => {
            await finalizePayment(
              invoice.id,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
          },
          onError: (message) => {
            toast.error(message);
            setPayingId(null);
          },
        });
        return;
      }

      await runStubPayment(orderId, async (paymentId, signature) => {
        await finalizePayment(invoice.id, orderId, paymentId, signature);
      });
    });
  }

  return (
    <div className="grid gap-4">
      {!isConfigured && (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">
          Dev mode: payments use a stub (no Razorpay keys). Add{" "}
          <code className="text-xs">RAZORPAY_KEY_ID</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_RAZORPAY_KEY_ID</code> for live
          checkout.
        </p>
      )}
      {invoices.map((invoice) => (
        <Card key={invoice.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                {invoice.description ?? "Fee invoice"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {invoice.student.user.name} · Due{" "}
                {format(new Date(invoice.dueDate), "MMM d, yyyy")}
              </p>
            </div>
            <Badge
              variant={invoice.status === "PAID" ? "default" : "secondary"}
            >
              {invoice.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="font-heading text-xl font-semibold">
              ₹{invoice.amount.toLocaleString("en-IN")}
            </p>
            {invoice.status !== "PAID" && (
              <Button
                onClick={() => handlePay(invoice)}
                disabled={
                  (isPending || checkoutLoading) && payingId === invoice.id
                }
                className="gap-2"
              >
                <CreditCard className="size-4" />
                {payingId === invoice.id ? "Processing..." : "Pay now"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
