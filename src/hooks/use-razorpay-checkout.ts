"use client";

import { useCallback, useState } from "react";
import type { RazorpayCheckoutResponse } from "@/lib/payments/types";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Script load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

type OpenCheckoutParams = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  onSuccess: (response: RazorpayCheckoutResponse) => void;
  onError: (message: string) => void;
};

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const isConfigured = Boolean(keyId) && !keyId?.includes("...");

  const openCheckout = useCallback(
    async (params: OpenCheckoutParams) => {
      if (!isConfigured || !keyId) {
        params.onError("Razorpay is not configured");
        return;
      }

      setLoading(true);
      try {
        await loadRazorpayScript();
        if (!window.Razorpay) throw new Error("Razorpay unavailable");

        const rzp = new window.Razorpay({
          key: keyId,
          amount: params.amount,
          currency: params.currency,
          order_id: params.orderId,
          name: "ScholarOS",
          description: params.description,
          theme: { color: "#6366f1" },
          handler: (response) => {
            setLoading(false);
            params.onSuccess(response);
          },
        });

        rzp.on("payment.failed", (response) => {
          setLoading(false);
          params.onError(response.error?.description ?? "Payment failed");
        });

        rzp.open();
      } catch (error) {
        setLoading(false);
        params.onError(error instanceof Error ? error.message : "Checkout failed");
      }
    },
    [isConfigured, keyId]
  );

  return { openCheckout, isConfigured, loading };
}

/** Dev stub — simulates payment without Razorpay keys or checkout UI. */
export async function runStubPayment(
  orderId: string,
  onConfirm: (paymentId: string, signature: string) => Promise<void>
) {
  const paymentId = `pay_stub_${Date.now()}`;
  await onConfirm(paymentId, "dev_stub_signature");
  return { orderId, paymentId };
}
