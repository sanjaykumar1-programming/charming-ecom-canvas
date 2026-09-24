import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BellOff, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireAuth } from "@/components/common/RequireAuth";
import { EmptyState, ErrorState, PageHeader, Pager, RowsSkeleton } from "@/components/common/states";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { NotificationItem, notificationHref } from "@/components/notifications/NotificationItem";
import { notificationsApi } from "@/api/endpoints";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { allMarkedRead, historyLoaded, markedRead, removed } from "@/store/notification/notificationSlice";
import { isRead, type AppNotification } from "@/types/api";
import { errorMessage } from "@/utils/errors";

type S = { page?: number | undefined; filter?: "unread" | undefined };

export const Route = createFileRoute("/notifications")({
  validateSearch: (s: Record<string, unknown>): S => ({
    page: Number(s["page"]) > 0 ? Math.floor(Number(s["page"])) : undefined,
    filter: s["filter"] === "unread" ? "unread" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Notifications — OrderMesh" },
      { name: "description", content: "Order, payment and system notifications." },
      { property: "og:title", content: "Notifications — OrderMesh" },
      { property: "og:description", content: "Order, payment and system notifications." },
    ],
  }),
  component: () => <RequireAuth><NotificationsPage /></RequireAuth>,
});

function NotificationsPage() {
  const { page = 1, filter } = Route.useSearch();
  const navigate = useNavigate({ from: "/notifications" });
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const unread = useAppSelector((s) => s.notifications.unreadCount);
  const liveEntities = useAppSelector((s) => s.notifications.entities);

  const q = useQuery({
    queryKey: ["notifications", { page, filter }],
    queryFn: () => notificationsApi.list({ page, limit: 20, ...(filter === "unread" ? { isRead: false } : {}) }),
    placeholderData: keepPreviousData,
  });
  useEffect(() => { if (q.data) dispatch(historyLoaded(q.data.items)); }, [q.data, dispatch]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const markOne = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: (id) => dispatch(markedRead(id)),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => { dispatch(allMarkedRead()); toast.success("All notifications marked as read"); },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  });
  const del = useMutation({
    mutationFn: notificationsApi.remove,
    onSuccess: (_d, id) => { dispatch(removed(id)); toast.success("Notification deleted"); },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  });

  // Merge server page with live read-state from the store (dedupe by id).
  const items: AppNotification[] = (q.data?.items ?? []).map((n) => liveEntities[n.id] ?? n)
    .filter((n) => filter !== "unread" || !isRead(n));

  const open = (n: AppNotification) => {
    if (!isRead(n)) markOne.mutate(n.id);
    const href = notificationHref(n);
    if (href) void navigate({ to: href.to, params: { id: href.id } });
  };

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications" description={`${unread} unread`} actions={
        <Button variant="outline" size="sm" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
          <Check className="size-4" />{markAll.isPending ? "Updating…" : "Mark all read"}
        </Button>
      } />
      <Tabs value={filter ?? "all"} onValueChange={(v) => navigate({ search: { filter: v === "unread" ? "unread" : undefined } })} className="mb-4">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList>
      </Tabs>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isPending ? <RowsSkeleton /> : items.length === 0 ? (
        <EmptyState icon={BellOff} title={filter === "unread" ? "No unread notifications" : "No notifications"} description="Order and payment updates will show up here." />
      ) : (
        <>
          <ul className="panel divide-y" aria-live="polite">
            {items.map((n) => (
              <li key={n.id} className={`flex items-center gap-2 pr-3 ${isRead(n) ? "" : "bg-accent/40"}`}>
                <button className="flex-1 text-left hover:bg-surface/60" onClick={() => open(n)}><NotificationItem n={n} /></button>
                {!isRead(n) && (
                  <Button variant="ghost" size="icon" aria-label="Mark as read" onClick={() => markOne.mutate(n.id)}><Check className="size-4" /></Button>
                )}
                <ConfirmDialog destructive title="Delete notification?" description="This notification will be permanently removed." confirmLabel="Delete"
                  onConfirm={() => del.mutate(n.id)} pending={del.isPending}
                  trigger={<Button variant="ghost" size="icon" aria-label="Delete notification"><Trash2 className="size-4" /></Button>} />
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={q.data.totalPages} onPage={(p) => navigate({ search: (s) => ({ ...s, page: p }) })} />
        </>
      )}
    </>
  );
}
