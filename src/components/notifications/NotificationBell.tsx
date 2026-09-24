import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { notificationsApi } from "@/api/endpoints";
import { allMarkedRead, historyLoaded, markedRead, notificationSelectors } from "@/store/notification/notificationSlice";
import { isRead, type AppNotification } from "@/types/api";
import { errorMessage } from "@/utils/errors";
import { NotificationItem, notificationHref } from "./NotificationItem";

export function NotificationBell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const unread = useAppSelector((s) => s.notifications.unreadCount);
  const items = useAppSelector((s) => notificationSelectors.selectAll(s.notifications)).slice(0, 8);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onOpen = async (v: boolean) => {
    setOpen(v);
    if (!v) return;
    setLoading(true);
    try {
      const page = await notificationsApi.list({ page: 1, limit: 8 });
      dispatch(historyLoaded(page.items));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onClick = async (n: AppNotification) => {
    if (!isRead(n)) {
      dispatch(markedRead(n.id));
      notificationsApi.markRead(n.id).catch(() => {});
    }
    const href = notificationHref(n);
    setOpen(false);
    if (href) void navigate({ to: href.to, params: { id: href.id } });
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      dispatch(allMarkedRead());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={unread === 0} onClick={markAll}>Mark all read</Button>
        </div>
        <div className="max-h-[380px] divide-y overflow-y-auto" aria-live="polite">
          {loading && items.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3"><Skeleton className="size-8" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-full" /></div></div>
            ))
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            items.map((n) => (
              <button key={n.id} className="block w-full hover:bg-surface focus-visible:bg-surface" onClick={() => onClick(n)}>
                <NotificationItem n={n} compact />
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs" onClick={() => setOpen(false)}>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
