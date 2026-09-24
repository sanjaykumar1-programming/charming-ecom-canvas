/**
 * Keeps the payment-initialization data returned by POST /orders/checkout so the
 * payment page can resume after a refresh. Never stores card data or secrets
 * beyond what the backend explicitly returned for the browser.
 */
export interface PaymentHandoff {
  provider?: string | undefined;
  checkoutUrl?: string | undefined;
  amountInCents?: number | undefined;
  status?: string | undefined;
}

const key = (orderId: string) => `ordermesh.payment.${orderId}`;

export function savePaymentHandoff(orderId: string, payment: Record<string, unknown> | null) {
  if (typeof window === "undefined" || !payment) return;
  const url = payment["checkoutUrl"] ?? payment["url"] ?? payment["redirectUrl"] ?? payment["sessionUrl"];
  const h: PaymentHandoff = {
    provider: typeof payment["provider"] === "string" ? payment["provider"] : undefined,
    checkoutUrl: typeof url === "string" ? url : undefined,
    amountInCents: typeof payment["amountInCents"] === "number" ? payment["amountInCents"] : undefined,
    status: typeof payment["status"] === "string" ? payment["status"] : undefined,
  };
  sessionStorage.setItem(key(orderId), JSON.stringify(h));
}

export function readPaymentHandoff(orderId: string): PaymentHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(orderId));
    return raw ? (JSON.parse(raw) as PaymentHandoff) : null;
  } catch {
    return null;
  }
}
