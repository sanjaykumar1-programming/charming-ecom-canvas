import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/common/RequireAuth";
import { ErrorState, RowsSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { OrderTimeline } from "@/features/orders/OrderTimeline";
import { ordersApi } from "@/api/endpoints";
import { itemUnit, orderPayment, orderTotal } from "@/types/api";
import { formatDateTime, formatMoney, shortId } from "@/utils/format";
import { errorMessage } from "@/utils/errors";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — OrderMesh" },
      { name: "description", content: "Status, items and shipping for your order." },
      { property: "og:title", content: "Order details — OrderMesh" },
      { property: "og:description", content: "Status, items and shipping for your order." },
    ],
  }),
  component: () => <RequireAuth roles={["CUSTOMER"]}><OrderPage /></RequireAuth>,
});

function OrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => ordersApi.get(id) });
  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => {
      toast.success("Order cancelled");
      void qc.invalidateQueries({ queryKey: ["order", id] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });

  return (
    <>
      <Link to="/orders" search={{}} className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />My orders</Link>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isPending ? <RowsSkeleton rows={4} /> : (() => {
        const o = q.data;
        const pay = orderPayment(o);
        const ps = o.paymentStatus ?? pay?.status;
        const a = o.shippingAddress;
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Order · {formatDateTime(o.createdAt)}</p>
                <h1 className="mt-1 font-mono text-2xl font-semibold">#{o.orderNumber ?? shortId(o.id)}</h1>
                <div className="mt-2 flex gap-2"><StatusBadge value={o.status} /><StatusBadge value={ps} /></div>
              </div>
              <div className="flex gap-2">
                {ps !== "SUCCESS" && o.status !== "CANCELLED" && ["PENDING", "CONFIRMED", "PAYMENT_PENDING"].includes(o.status) && (
                  <Button asChild variant="outline" size="sm"><Link to="/payment/$orderId" params={{ orderId: o.id }}><CreditCard className="size-4" />Payment</Link></Button>
                )}
                {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                  <ConfirmDialog destructive title="Cancel this order?" description="Are you sure you want to cancel this order? This can't be undone."
                    confirmLabel="Cancel order" onConfirm={() => cancel.mutate()} pending={cancel.isPending}
                    trigger={<Button variant="outline" size="sm" disabled={cancel.isPending}>{cancel.isPending ? "Cancelling…" : "Cancel order"}</Button>} />
                )}
              </div>
            </div>

            <section className="panel p-6" aria-label="Order progress"><OrderTimeline status={o.status} /></section>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <section className="panel overflow-hidden">
                <h2 className="border-b px-4 py-3 text-sm font-medium">Items</h2>
                <ul className="divide-y">
                  {o.items.map((i, idx) => (
                    <li key={i.id ?? `${i.productId}-${idx}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.productName ?? i.product?.name ?? "Product"}</p>
                        <p className="font-mono text-xs text-muted-foreground">{i.sku ?? i.product?.sku} · {i.quantity} × {formatMoney(itemUnit(i))}</p>
                      </div>
                      <span className="font-mono font-semibold">{formatMoney(i.totalInCents ?? itemUnit(i) * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t bg-surface px-4 py-3"><span className="font-medium">Total</span><span className="font-mono font-semibold">{formatMoney(orderTotal(o))}</span></div>
              </section>
              <section className="panel h-fit p-4 text-sm">
                <h2 className="eyebrow mb-3">Shipping address</h2>
                {a ? (
                  <address className="not-italic leading-relaxed">
                    <span className="font-medium">{a.name}</span><br />{a.addressLine1}{a.addressLine2 && <><br />{a.addressLine2}</>}<br />
                    {a.city}, {a.state} {a.postalCode}<br />{a.country}<br /><span className="font-mono text-xs text-muted-foreground">{a.phone}</span>
                  </address>
                ) : <p className="text-muted-foreground">Not available</p>}
                {o.notes && <><h2 className="eyebrow mb-1 mt-4">Notes</h2><p className="text-muted-foreground">{o.notes}</p></>}
              </section>
            </div>
          </div>
        );
      })()}
    </>
  );
}
