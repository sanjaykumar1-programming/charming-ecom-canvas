import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoriesApi, productsApi } from "@/api/endpoints";
import { useDebounce } from "@/hooks/use-debounce";
import { EmptyState, ErrorState, PageHeader, Pager } from "@/components/common/states";
import { ProductCard, ProductCardSkeleton } from "@/features/products/ProductCard";

type S = { search?: string | undefined; category?: string | undefined; page?: number | undefined };

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    search: typeof s["search"] === "string" && s["search"] ? s["search"] : undefined,
    category: typeof s["category"] === "string" && s["category"] ? s["category"] : undefined,
    page: Number(s["page"]) > 0 ? Math.floor(Number(s["page"])) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Products — OrderMesh" },
      { name: "description", content: "Browse the OrderMesh product catalog." },
      { property: "og:title", content: "Products — OrderMesh" },
      { property: "og:description", content: "Browse the OrderMesh product catalog." },
    ],
  }),
  component: ProductsPage,
});

const LIMIT = 12;

function ProductsPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });
  const page = s.page ?? 1;
  const [text, setText] = useState(s.search ?? "");
  const debounced = useDebounce(text, 400);

  useEffect(() => setText(s.search ?? ""), [s.search]);
  useEffect(() => {
    if ((debounced || undefined) !== s.search) void navigate({ search: (p) => ({ ...p, search: debounced || undefined, page: undefined }), replace: true });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const q = useQuery({
    queryKey: ["products", { page, search: s.search, category: s.category }],
    queryFn: () => productsApi.list({ page, limit: LIMIT, search: s.search, categoryId: s.category }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader eyebrow="Catalog" title="Products" description={q.data ? `${q.data.total} products` : undefined} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by name or SKU" aria-label="Search products" className="pl-8" />
        </div>
        <Select value={s.category ?? "all"} onValueChange={(v) => navigate({ search: (p) => ({ ...p, category: v === "all" ? undefined : v, page: undefined }) })}>
          <SelectTrigger className="sm:w-56" aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(cats.data ?? []).filter((c) => c.isActive !== false).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : q.data.items.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No products found" description="Try a different search term or category."
          action={(s.search || s.category) && <Button variant="outline" onClick={() => navigate({ search: {} })}>Clear filters</Button>} />
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 ${q.isFetching ? "opacity-70" : ""}`}>
            {q.data.items.filter((p) => p.isActive !== false).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <Pager page={page} totalPages={q.data.totalPages} onPage={(n) => navigate({ search: (p) => ({ ...p, page: n }) })} />
        </>
      )}
    </>
  );
}
