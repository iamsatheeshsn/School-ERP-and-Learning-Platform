import crypto from "crypto";
import Razorpay from "razorpay";
import type { PaymentOrder, PaymentProvider } from "@/lib/payments/types";

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.includes("...") || value === "your_secret_key";
}

function hasRazorpayKeys(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      !isPlaceholder(process.env.RAZORPAY_KEY_ID) &&
      !isPlaceholder(process.env.RAZORPAY_KEY_SECRET)
  );
}

function getClient(): Razorpay | null {
  if (!hasRazorpayKeys()) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

/** True when real Razorpay API keys are configured (not placeholders). */
export function isRazorpayLive(): boolean {
  return hasRazorpayKeys();
}

export class RazorpayProvider implements PaymentProvider {
  async createOrder(invoiceId: string, amount: number): Promise<PaymentOrder> {
    const client = getClient();

    if (!client) {
      return {
        orderId: `order_stub_${invoiceId}_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: "INR",
        invoiceId,
      };
    }

    const order = await client.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: invoiceId.slice(0, 40),
      notes: { invoiceId },
    });

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      invoiceId,
    };
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> {
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!hasRazorpayKeys() || !secret) {
      return Boolean(orderId && paymentId);
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return expected === signature;
  }
}

export const paymentProvider: PaymentProvider = new RazorpayProvider();
