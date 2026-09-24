import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/common/RequireAuth";
import { EmptyState, ErrorState, PageHeader, Pager, RowsSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ordersApi } from "@/api/endpoints";
import { orderPayment, orderTotal } from "@/types/api";
import { formatDate, formatMoney, shortId } from "@/utils/format";

export const Route = createFileRoute("/orders/")({
  validateSearch: (s: Record<string, unknown>): { page?: number | undefined } => ({
    page: Number(s["page"]) > 0 ? Math.floor(Number(s["page"])) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My orders — OrderMesh" },
      { name: "description", content: "Track and manage your OrderMesh orders." },
      { property: "og:title", content: "My orders — OrderMesh" },
      { property: "og:description", content: "Track and manage your OrderMesh orders." },
    ],
  }),
  component: () => <RequireAuth roles={["CUSTOMER"]}><OrdersPage /></RequireAuth>,
});

function OrdersPage() {
  const { page = 1 } = Route.useSearch();
  const navigate = useNavigate({ from: "/orders/" });
  const q = useQuery({ queryKey: ["orders", { page }], queryFn: () => ordersApi.list({ page, limit: 10 }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader eyebrow="Account" title="My orders" description={q.data ? `${q.data.total} orders` : undefined} />
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isPending ? <RowsSkeleton /> : q.data.items.length === 0 ? (
        <EmptyState icon={Receipt} title="You have no orders yet" description="Your orders will appear here once you check out."
          action={<Button asChild><Link to="/products" search={{}}>Start shopping</Link></Button>} />
      ) : (
        <>
          <div className="panel overflow-hidden">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_24px] gap-4 border-b bg-surface px-4 py-2.5 eyebrow md:grid">
              <span>Order</span><span>Date</span><span>Items</span><span>Payment</span><span className="text-right">Amount</span><span />
            </div>
            <ul className="divide-y">
              {q.data.items.map((o) => (
                <li key={o.id}>
                  <Link to="/orders/$id" params={{ id: o.id }} className="grid grid-cols-2 gap-2 px-4 py-3.5 hover:bg-surface md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_24px] md:items-center md:gap-4">
                    <span className="flex flex-col gap-1"><span className="font-mono text-sm font-medium">#{o.orderNumber ?? shortId(o.id)}</span><StatusBadge value={o.status} className="w-fit" /></span>
                    <span className="text-right text-sm text-muted-foreground md:text-left">{formatDate(o.createdAt)}</span>
                    <span className="text-sm text-muted-foreground">{o.items?.reduce((n, i) => n + i.quantity, 0) ?? 0} items</span>
                    <span className="text-right md:text-left"><StatusBadge value={o.paymentStatus ?? orderPayment(o)?.status} /></span>
                    <span className="col-span-2 text-right font-mono text-sm font-semibold md:col-span-1">{formatMoney(orderTotal(o))}</span>
                    <ChevronRight className="hidden size-4 text-muted-foreground md:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Pager page={page} totalPages={q.data.totalPages} onPage={(n) => navigate({ search: { page: n } })} />
        </>
      )}
    </>
  );
}
