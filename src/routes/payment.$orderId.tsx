import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, XCircle, Ban, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/common/RequireAuth";
import { ErrorState, RowsSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ordersApi } from "@/api/endpoints";
import { readPaymentHandoff, type PaymentHandoff } from "@/features/checkout/paymentHandoff";
import { orderPayment, orderTotal, type Order } from "@/types/api";
import { formatMoney, shortId } from "@/utils/format";

export const Route = createFileRoute("/payment/$orderId")({
  head: () => ({
    meta: [
      { title: "Payment — OrderMesh" },
      { name: "description", content: "Complete payment for your OrderMesh order." },
      { property: "og:title", content: "Payment — OrderMesh" },
      { property: "og:description", content: "Complete payment for your OrderMesh order." },
    ],
  }),
  component: () => <RequireAuth roles={["CUSTOMER"]}><PaymentPage /></RequireAuth>,
});

type UiState = "INITIALIZING" | "READY" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";

/** Derived only from backend order/payment state. */
function deriveState(o: Order | undefined, h: PaymentHandoff | null): UiState {
  if (!o) return "INITIALIZING";
  const ps = o.paymentStatus ?? orderPayment(o)?.status;
  if (o.status === "CANCELLED") return "CANCELLED";
  if (ps === "SUCCESS" || ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"].includes(o.status)) return "SUCCESS";
  if (ps === "FAILED") return "FAILED";
  if (ps === "REFUNDED") return "REFUNDED";
  return h?.checkoutUrl ? "READY" : "PROCESSING";
}
const TERMINAL: UiState[] = ["SUCCESS", "FAILED", "CANCELLED", "REFUNDED"];

function PaymentPage() {
  const { orderId } = Route.useParams();
  const [handoff, setHandoff] = useState<PaymentHandoff | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => setHandoff(readPaymentHandoff(orderId)), [orderId]);

  const q = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    // Poll while payment is unresolved; socket events also invalidate this query.
    refetchInterval: (query) => (TERMINAL.includes(deriveState(query.state.data, handoff)) ? false : 5000),
  });

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.isPending) return <RowsSkeleton rows={3} />;

  const o = q.data;
  const state = deriveState(o, handoff);
  const pay = orderPayment(o);
  const amount = pay?.amountInCents ?? handoff?.amountInCents ?? orderTotal(o);

  const view: Record<UiState, { icon: typeof CreditCard; tone: string; title: string; body: string }> = {
    INITIALIZING: { icon: Loader2, tone: "text-muted-foreground", title: "Preparing payment", body: "Setting up your payment." },
    READY: { icon: CreditCard, tone: "text-primary", title: "Complete your payment", body: "You'll be redirected to our secure payment provider." },
    PROCESSING: { icon: Loader2, tone: "text-info", title: "Payment processing", body: "We're waiting for confirmation from the payment provider. This page updates automatically." },
    SUCCESS: { icon: CheckCircle2, tone: "text-success", title: "Payment successful", body: "Your payment has been confirmed. We'll notify you as your order progresses." },
    FAILED: { icon: XCircle, tone: "text-destructive", title: "Payment failed", body: "Your payment could not be completed. Your order has not been duplicated." },
    CANCELLED: { icon: Ban, tone: "text-muted-foreground", title: "Order cancelled", body: "This order was cancelled and no further payment is required." },
    REFUNDED: { icon: RotateCcw, tone: "text-muted-foreground", title: "Payment refunded", body: "This payment has been refunded." },
  };
  const v = view[state];
  const Icon = v.icon;

  return (
    <div className="mx-auto max-w-lg">
      <p className="eyebrow mb-3 text-center">Step 3 of 3 · Payment</p>
      <div className="panel p-8 text-center" role="status" aria-live="polite">
        <Icon className={`mx-auto size-10 ${v.tone} ${state === "PROCESSING" || state === "INITIALIZING" ? "animate-spin" : ""}`} aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{v.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>

        <dl className="mt-6 grid grid-cols-2 gap-y-2 border-t pt-5 text-left text-sm">
          <dt className="text-muted-foreground">Order</dt><dd className="text-right font-mono">#{o.orderNumber ?? shortId(o.id)}</dd>
          <dt className="text-muted-foreground">Amount</dt><dd className="text-right font-mono font-semibold">{formatMoney(amount)}</dd>
          <dt className="text-muted-foreground">Provider</dt><dd className="text-right">{pay?.provider ?? handoff?.provider ?? "Stripe"}</dd>
          <dt className="text-muted-foreground">Status</dt><dd className="text-right"><StatusBadge value={o.paymentStatus ?? pay?.status ?? "PENDING"} /></dd>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          {state === "READY" && handoff?.checkoutUrl && (
            <Button size="lg" disabled={redirecting} onClick={() => { setRedirecting(true); window.location.assign(handoff.checkoutUrl!); }}>
              {redirecting ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
              {redirecting ? "Processing payment…" : "Continue to secure payment"}
            </Button>
          )}
          <Button asChild variant={state === "SUCCESS" ? "default" : "outline"}><Link to="/orders/$id" params={{ id: o.id }}>View order</Link></Button>
          {(state === "SUCCESS" || state === "CANCELLED") && <Button asChild variant="ghost"><Link to="/products" search={{}}>Continue shopping</Link></Button>}
          {state === "FAILED" && <p className="text-xs text-muted-foreground">Retrying payment isn't available for this order yet. Please contact support or place a new order.</p>}
        </div>
      </div>
    </div>
  );
}
