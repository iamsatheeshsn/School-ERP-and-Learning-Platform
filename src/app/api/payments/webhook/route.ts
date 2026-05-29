import { confirmPayment } from "@/actions/fees";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, orderId, paymentId, signature } = body as {
      invoiceId?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };

    if (invoiceId && orderId && paymentId) {
      await confirmPayment({ invoiceId, orderId, paymentId, signature: signature ?? "" });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[payments/webhook]", error);
    return Response.json({ received: true, error: "Processing failed" });
  }
}
