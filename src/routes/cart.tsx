import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/common/RequireAuth";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton } from "@/components/common/states";
import { QuantityStepper } from "@/components/common/QuantityStepper";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { ProductImage } from "@/features/products/ProductCard";
import { cartTotal, useCart, useCartMutations } from "@/features/cart/useCart";
import { itemUnit } from "@/types/api";
import { formatMoney } from "@/utils/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — OrderMesh" },
      { name: "description", content: "Review items in your OrderMesh cart." },
      { property: "og:title", content: "Your cart — OrderMesh" },
      { property: "og:description", content: "Review items in your OrderMesh cart." },
    ],
  }),
  component: () => <RequireAuth roles={["CUSTOMER"]}><CartPage /></RequireAuth>,
});

function CartPage() {
  const q = useCart();
  const { update, remove, clear } = useCartMutations();
  const items = q.data?.items ?? [];
  const busyId = (update.isPending && update.variables?.productId) || (remove.isPending && remove.variables) || null;

  return (
    <>
      <PageHeader eyebrow="Checkout" title="Cart" actions={items.length > 0 && (
        <ConfirmDialog destructive title="Clear your cart?" description="All items will be removed from your cart." confirmLabel="Clear cart"
          onConfirm={() => clear.mutate()} pending={clear.isPending}
          trigger={<Button variant="outline" size="sm" disabled={clear.isPending}>{clear.isPending ? "Clearing…" : "Clear cart"}</Button>} />
      )} />
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isPending ? <RowsSkeleton rows={3} /> : items.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Browse the catalog and add products to get started."
          action={<Button asChild><Link to="/products" search={{}}>Continue shopping</Link></Button>} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <ul className="panel divide-y">
            {items.map((i) => {
              const busy = busyId === i.productId;
              return (
                <li key={i.productId} className="flex gap-4 p-4">
                  <Link to="/products/$id" params={{ id: i.productId }} className="size-20 shrink-0 overflow-hidden rounded-md border"><ProductImage product={i.product} /></Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.product?.name ?? "Product"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{i.product?.sku} · {formatMoney(itemUnit(i))} each</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <QuantityStepper value={i.quantity} busy={busy} disabled={!!busyId}
                        onChange={(v) => update.mutate({ productId: i.productId, quantity: v })} />
                      <span className="w-24 text-right font-mono text-sm font-semibold">{formatMoney(itemUnit(i) * i.quantity)}</span>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${i.product?.name ?? "item"}`} disabled={!!busyId} onClick={() => remove.mutate(i.productId)}>
                        {remove.isPending && remove.variables === i.productId ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="panel h-fit p-5">
            <p className="eyebrow">Summary</p>
            <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">Items</span><span className="font-mono">{items.reduce((n, i) => n + i.quantity, 0)}</span></div>
            <div className="mt-3 flex justify-between border-t pt-3"><span className="font-medium">Subtotal</span><span className="font-mono font-semibold">{formatMoney(cartTotal(q.data))}</span></div>
            <p className="mt-2 text-xs text-muted-foreground">Final amount is confirmed at checkout.</p>
            <Button asChild className="mt-5 w-full" disabled={!!busyId}><Link to="/checkout">Proceed to checkout</Link></Button>
            <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/products" search={{}}>Continue shopping</Link></Button>
          </aside>
        </div>
      )}
    </>
  );
}
