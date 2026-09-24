import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { productsApi } from "@/api/endpoints";
import { useAuth } from "@/app/store";
import { ErrorState } from "@/components/common/states";
import { QuantityStepper } from "@/components/common/QuantityStepper";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProductImage } from "@/features/products/ProductCard";
import { useCartMutations } from "@/features/cart/useCart";
import { formatMoney } from "@/utils/format";

export const Route = createFileRoute("/products/$id")({
  head: () => ({
    meta: [
      { title: "Product details — OrderMesh" },
      { name: "description", content: "Product details, pricing and availability on OrderMesh." },
      { property: "og:title", content: "Product details — OrderMesh" },
      { property: "og:description", content: "Product details, pricing and availability on OrderMesh." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const { add } = useCartMutations();
  const q = useQuery({ queryKey: ["product", id], queryFn: () => productsApi.get(id) });

  const onAdd = () => {
    if (!user) return void navigate({ to: "/auth/login", search: { redirect: `/products/${id}` } });
    add.mutate({ productId: id, quantity: qty });
  };

  return (
    <>
      <Link to="/products" search={{}} className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />All products</Link>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isPending ? (
        <div className="grid gap-10 md:grid-cols-2"><Skeleton className="aspect-square" /><div className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-6 w-28" /><Skeleton className="h-24 w-full" /></div></div>
      ) : (() => {
        const p = q.data;
        const avail = p.inventory?.availableQuantity;
        const out = p.isActive === false || avail === 0;
        return (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="panel aspect-square overflow-hidden"><ProductImage product={p} /></div>
            <div>
              <p className="eyebrow">{p.category?.name ?? "Product"}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{p.name}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">SKU {p.sku}</p>
              <p className="mt-5 font-mono text-2xl font-semibold">{formatMoney(p.priceInCents)}</p>
              <div className="mt-3">
                {p.isActive === false ? <StatusBadge value="CANCELLED" label="Unavailable" />
                  : avail === undefined ? null
                  : avail === 0 ? <StatusBadge value="FAILED" label="Out of stock" />
                  : <StatusBadge value="SUCCESS" label={`${avail} available`} />}
              </div>
              {p.description && <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
              {(!user || user.role === "CUSTOMER") && (
                <div className="mt-8 flex items-center gap-3 border-t pt-6">
                  <QuantityStepper value={qty} onChange={setQty} disabled={out} max={avail && avail > 0 ? avail : 99} />
                  <Button size="lg" onClick={onAdd} disabled={out || add.isPending}>
                    {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
                    {add.isPending ? "Adding…" : "Add to cart"}
                  </Button>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Stock is confirmed at checkout.</p>
            </div>
          </div>
        );
      })()}
    </>
  );
}
