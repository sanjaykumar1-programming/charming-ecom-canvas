import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Tags } from "lucide-react";
import { categoriesApi } from "@/api/endpoints";
import { EmptyState, ErrorState, PageHeader } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — OrderMesh" },
      { name: "description", content: "Shop OrderMesh products by category." },
      { property: "og:title", content: "Categories — OrderMesh" },
      { property: "og:description", content: "Shop OrderMesh products by category." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const q = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const list = (q.data ?? []).filter((c) => c.isActive !== false);
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Categories" />
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : list.length === 0 ? <EmptyState icon={Tags} title="No categories found" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => (
            <Link key={c.id} to="/products" search={{ category: c.id }} className="group panel flex flex-col justify-between p-5 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-6">
                <h2 className="font-medium">{c.name}</h2>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
