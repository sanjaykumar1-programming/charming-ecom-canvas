import type { ReactNode } from "react";
import { AlertTriangle, WifiOff, ShieldOff, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseApiError } from "@/utils/errors";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string | undefined; title: string; description?: string | undefined; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon; title: string; description?: string | undefined; action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-md border bg-surface">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: (() => void) | undefined }) {
  const e = parseApiError(error);
  const Icon = e.kind === "network" ? WifiOff : e.kind === "forbidden" ? ShieldOff : AlertTriangle;
  return (
    <div role="alert" className="panel flex flex-col items-center px-6 py-12 text-center">
      <Icon className="mb-3 size-6 text-destructive" aria-hidden />
      <h3 className="font-medium">
        {e.kind === "forbidden" ? "Not authorized" : e.kind === "notfound" ? "Not found" : "Couldn't load this"}
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{e.message}</p>
      {onRetry && e.kind !== "forbidden" && e.kind !== "notfound" && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel divide-y" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/5" /></div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      <span className="font-mono text-xs text-muted-foreground">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}
