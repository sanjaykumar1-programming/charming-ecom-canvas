import { cn } from "@/lib/utils";
import { humanize } from "@/utils/format";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";
const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  brand: "bg-accent text-accent-foreground border-primary/20",
};

const TONE_BY_VALUE: Record<string, Tone> = {
  PENDING: "neutral", CONFIRMED: "brand", PAYMENT_PENDING: "warning", PAID: "success",
  PROCESSING: "info", PACKED: "info", SHIPPED: "brand", DELIVERED: "success", CANCELLED: "danger",
  SUCCESS: "success", FAILED: "danger", REFUNDED: "neutral",
  CREATED: "neutral", SUCCEEDED: "success",
};

export function StatusBadge({ value, label, className }: { value?: string | undefined; label?: string; className?: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const tone = TONE_BY_VALUE[value] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
        TONES[tone], className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label ?? humanize(value)}
    </span>
  );
}
