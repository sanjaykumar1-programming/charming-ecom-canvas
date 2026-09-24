import type { ReactNode } from "react";
import { Logo } from "@/components/layout/AppShell";

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-7 mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
      <aside className="relative hidden overflow-hidden border-l bg-surface lg:block" aria-hidden>
        <div className="mesh-grid absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="panel max-w-sm p-5">
            <p className="eyebrow">Live order</p>
            <div className="mt-3 space-y-2.5 font-mono text-xs">
              {["Order placed", "Payment confirmed", "Packed at warehouse", "Out for delivery"].map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <span className={`size-2 rounded-full ${i < 3 ? "bg-primary" : "bg-warning"}`} />
                  <span className={i < 3 ? "" : "text-muted-foreground"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight">Every order, from cart to doorstep, in one connected mesh.</p>
        </div>
      </aside>
    </div>
  );
}
