import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Receipt, ShoppingCart, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useAppSelector } from "@/app/store";
import { categoriesApi, ordersApi, productsApi } from "@/api/endpoints";
import { ErrorState, RowsSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProductCard, ProductCardSkeleton } from "@/features/products/ProductCard";
import { cartCount, cartTotal, useCart } from "@/features/cart/useCart";
import { orderTotal } from "@/types/api";
import { formatDate, formatMoney, shortId } from "@/utils/format";
import hero from "@/assets/storefront-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrderMesh — Shop and track every order" },
      { name: "description", content: "Browse products, check out securely and follow your orders in real time with OrderMesh." },
      { property: "og:title", content: "OrderMesh — Shop and track every order" },
      { property: "og:description", content: "Browse products, check out securely and follow your orders in real time." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, status } = useAuth();
  if (status === "ready" && user?.role === "CUSTOMER") return <CustomerDashboard />;
  if (status === "ready" && user) return <StaffHome />;
  return <Storefront />;
}

function LatestProducts({ limit = 8 }: { limit?: number }) {
  const q = useQuery({ queryKey: ["products", { page: 1, limit }], queryFn: () => productsApi.list({ page: 1, limit }) });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {q.isPending ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
        : q.data.items.filter((p) => p.isActive !== false).slice(0, limit).map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

function Storefront() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  return (
    <div className="space-y-14">
      <section className="panel relative overflow-hidden">
        <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="relative max-w-lg px-6 py-16 sm:px-10 sm:py-24">
          <p className="eyebrow">OrderMesh store</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Everyday essentials, tracked from cart to doorstep.</h1>
          <p className="mt-4 text-muted-foreground">Check out securely and get live updates at every step of fulfillment.</p>
          <div className="mt-7 flex gap-3">
            <Button asChild size="lg"><Link to="/products" search={{}}>Shop products<ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth/register">Create account</Link></Button>
          </div>
        </div>
      </section>

      {(cats.data?.length ?? 0) > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between"><h2 className="text-lg font-semibold">Categories</h2><Link to="/categories" className="text-sm text-primary hover:underline">View all</Link></div>
          <div className="flex flex-wrap gap-2">
            {cats.data!.filter((c) => c.isActive !== false).slice(0, 12).map((c) => (
              <Link key={c.id} to="/products" search={{ category: c.id }} className="rounded-md border bg-card px-3 py-1.5 text-sm hover:border-primary/40">{c.name}</Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between"><h2 className="text-lg font-semibold">Latest products</h2><Link to="/products" search={{}} className="text-sm text-primary hover:underline">Browse catalog</Link></div>
        <LatestProducts />
      </section>
    </div>
  );
}

function CustomerDashboard() {
  const { user } = useAuth();
  const unread = useAppSelector((s) => s.notifications.unreadCount);
  const cart = useCart();
  const orders = useQuery({ queryKey: ["orders", { page: 1, limit: 5 }], queryFn: () => ordersApi.list({ page: 1, limit: 5 }) });
  const active = (orders.data?.items ?? []).filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {user?.firstName}</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat to="/cart" icon={ShoppingCart} label="Cart" value={cart.isPending ? null : `${cartCount(cart.data)} items`} sub={cart.data ? formatMoney(cartTotal(cart.data)) : ""} />
        <Stat to="/orders" icon={Receipt} label="Current orders" value={orders.isPending ? null : String(active.length)} sub="In progress" />
        <Stat to="/notifications" icon={Bell} label="Unread notifications" value={String(unread)} sub="View inbox" />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between"><h2 className="font-semibold">Recent orders</h2><Link to="/orders" search={{}} className="text-sm text-primary hover:underline">All orders</Link></div>
        {orders.isError ? <ErrorState error={orders.error} onRetry={() => orders.refetch()} /> : orders.isPending ? <RowsSkeleton rows={3} /> : orders.data.items.length === 0 ? (
          <div className="panel p-6 text-sm text-muted-foreground">You have no orders yet. <Link to="/products" search={{}} className="text-primary hover:underline">Start shopping</Link></div>
        ) : (
          <ul className="panel divide-y">
            {orders.data.items.map((o) => (
              <li key={o.id}>
                <Link to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface">
                  <div><p className="font-mono text-sm font-medium">#{o.orderNumber ?? shortId(o.id)}</p><p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p></div>
                  <div className="flex items-center gap-4"><StatusBadge value={o.status} /><span className="w-24 text-right font-mono text-sm">{formatMoney(orderTotal(o))}</span></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Recently added</h2>
        <LatestProducts limit={4} />
      </section>
    </div>
  );
}

function Stat({ to, icon: Icon, label, value, sub }: { to: "/cart" | "/orders" | "/notifications"; icon: typeof Bell; label: string; value: string | null; sub: string }) {
  return (
    <Link to={to} className="panel group p-4 hover:border-primary/40">
      <div className="flex items-center justify-between"><p className="eyebrow">{label}</p><Icon className="size-4 text-muted-foreground group-hover:text-primary" /></div>
      {value === null ? <Skeleton className="mt-3 h-7 w-20" /> : <p className="mt-2 text-2xl font-semibold">{value}</p>}
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{sub}</p>
    </Link>
  );
}

function StaffHome() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <Boxes className="mx-auto size-8 text-primary" />
      <p className="eyebrow mt-4">{user?.role} console</p>
      <h1 className="mt-2 text-2xl font-semibold">Welcome, {user?.firstName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">The {user?.role.toLowerCase()} workspace is being rolled out. You can browse the catalog and manage notifications and your profile meanwhile.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild variant="outline"><Link to="/notifications" search={{}}>Notifications</Link></Button>
        <Button asChild><Link to="/products" search={{}}>Catalog</Link></Button>
      </div>
    </div>
  );
}
