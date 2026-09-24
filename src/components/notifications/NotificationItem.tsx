import {
  Bell, CreditCard, PackageCheck, PackageX, Package, Truck, CheckCircle2, XCircle, Boxes, ShoppingBag, Cog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isRead, type AppNotification, type NotificationType } from "@/types/api";
import { timeAgo } from "@/utils/format";

const META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  ORDER_CREATED: { icon: ShoppingBag, tone: "text-primary" },
  PAYMENT_SUCCESS: { icon: CheckCircle2, tone: "text-success" },
  PAYMENT_FAILED: { icon: XCircle, tone: "text-destructive" },
  ORDER_PROCESSING: { icon: Cog, tone: "text-info" },
  ORDER_PACKED: { icon: Package, tone: "text-info" },
  ORDER_SHIPPED: { icon: Truck, tone: "text-primary" },
  ORDER_DELIVERED: { icon: PackageCheck, tone: "text-success" },
  ORDER_CANCELLED: { icon: PackageX, tone: "text-destructive" },
  INVENTORY_ALERT: { icon: Boxes, tone: "text-warning" },
  SYSTEM: { icon: Bell, tone: "text-muted-foreground" },
};
export const notificationMeta = (t: string) => META[t as NotificationType] ?? { icon: CreditCard, tone: "text-muted-foreground" };

export function NotificationItem({ n, compact }: { n: AppNotification; compact?: boolean }) {
  const { icon: Icon, tone } = notificationMeta(n.type);
  const unread = !isRead(n);
  return (
    <div className={cn("flex gap-3", compact ? "p-3" : "p-4")}>
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border bg-surface">
        <Icon className={cn("size-4", tone)} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium text-foreground/80")}>{n.title}</p>
          {unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
        </div>
        <p className={cn("text-xs text-muted-foreground", compact && "line-clamp-2")}>{n.message}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  );
}

/** Deep-link only when entity info is present and recognised. */
export function notificationHref(n: AppNotification): { to: "/orders/$id" | "/products/$id"; id: string } | null {
  if (!n.entityId || !n.entityType) return null;
  const t = n.entityType.toUpperCase();
  if (t === "ORDER" || t === "PAYMENT") return { to: "/orders/$id", id: n.entityId };
  if (t === "PRODUCT") return { to: "/products/$id", id: n.entityId };
  return null;
}
