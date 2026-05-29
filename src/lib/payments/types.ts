export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  invoiceId: string;
}

export interface PaymentProvider {
  createOrder(invoiceId: string, amount: number): Promise<PaymentOrder>;
  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean>;
}

export type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
};
