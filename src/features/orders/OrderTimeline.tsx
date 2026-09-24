import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/api";

const STEPS: { label: string; statuses: OrderStatus[] }[] = [
  { label: "Order placed", statuses: ["PENDING", "CONFIRMED"] },
  { label: "Payment", statuses: ["PAYMENT_PENDING", "PAID"] },
  { label: "Processing", statuses: ["PROCESSING"] },
  { label: "Packed", statuses: ["PACKED"] },
  { label: "Shipped", statuses: ["SHIPPED"] },
  { label: "Delivered", statuses: ["DELIVERED"] },
];

/** Presentational only — reflects whatever status the backend returns. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <ol className="flex items-center gap-3" aria-label="Order progress">
        <Step state="done" label="Order placed" />
        <span className="h-px w-10 bg-border" aria-hidden />
        <Step state="cancelled" label="Cancelled" current />
      </ol>
    );
  }
  const idx = Math.max(0, STEPS.findIndex((s) => s.statuses.includes(status)));
  const complete = status === "DELIVERED";
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const state = i < idx || (complete && i === idx) || (status === "PAID" && i === 1) ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.label} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={cn("absolute right-1/2 top-3 h-px w-full", i <= idx ? "bg-primary" : "bg-border")} aria-hidden />}
            <Dot state={state} />
            <span className={cn("mt-2 text-[11px] leading-tight", state === "todo" ? "text-muted-foreground" : "font-medium")}>{s.label}</span>
            {i === idx && <span className="sr-only">(current)</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Dot({ state }: { state: "done" | "current" | "todo" | "cancelled" }) {
  return (
    <span className={cn(
      "relative z-10 grid size-6 place-items-center rounded-full border text-[10px]",
      state === "done" && "border-primary bg-primary text-primary-foreground",
      state === "current" && "border-primary bg-background text-primary ring-4 ring-primary/15",
      state === "todo" && "bg-background text-muted-foreground",
      state === "cancelled" && "border-destructive bg-destructive text-destructive-foreground",
    )}>
      {state === "done" ? <Check className="size-3" /> : state === "cancelled" ? <X className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
    </span>
  );
}
function Step({ state, label, current }: { state: "done" | "cancelled"; label: string; current?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <Dot state={state} />
      <span className="text-xs font-medium">{label}</span>
      {current && <span className="sr-only">(current)</span>}
    </li>
  );
}
