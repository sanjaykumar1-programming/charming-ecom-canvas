import { Minus, Plus, Loader2 } from "lucide-react";

export function QuantityStepper({ value, onChange, disabled, busy, min = 1, max = 99 }: {
  value: number; onChange: (v: number) => void; disabled?: boolean; busy?: boolean; min?: number; max?: number;
}) {
  const off = disabled || busy;
  return (
    <div className="inline-flex h-9 items-center rounded-md border bg-card" role="group" aria-label="Quantity">
      <button type="button" className="grid h-full w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={off || value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease quantity"><Minus className="size-3.5" /></button>
      <span className="grid w-8 place-items-center font-mono text-sm" aria-live="polite">{busy ? <Loader2 className="size-3.5 animate-spin" /> : value}</span>
      <button type="button" className="grid h-full w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={off || value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity"><Plus className="size-3.5" /></button>
    </div>
  );
}
