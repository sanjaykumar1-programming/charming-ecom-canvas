import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, LayoutGrid, Package, ShoppingCart, Receipt, Bell, User, Search, LogOut, Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/store";
import { getStore } from "@/app/providers";
import { endSession } from "@/features/auth/session";
import { useCart, cartCount } from "@/features/cart/useCart";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="OrderMesh home">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">OrderMesh</span>
    </Link>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-md md:block"
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({ to: "/products", search: { search: q.trim() || undefined, page: 1 } });
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, SKUs…" aria-label="Search products" className="h-9 bg-surface pl-8" />
    </form>
  );
}

const CUSTOMER_NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/products", label: "Products", icon: LayoutGrid },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/notifications", label: "Alerts", icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isCustomer = user?.role === "CUSTOMER";
  const { data: cart } = useCart();
  const count = cartCount(cart);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logout = () => {
    endSession(getStore(), qc);
    void navigate({ to: "/auth/login", replace: true });
  };

  const initials = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() : "";

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {[{ to: "/products", label: "Products" }, { to: "/categories", label: "Categories" }, ...(isCustomer ? [{ to: "/orders", label: "My orders" }] : [])].map((l) => (
              <Link key={l.to} to={l.to} className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 justify-end md:justify-center"><HeaderSearch /></div>
          <div className="flex items-center gap-1">
            {mounted && user ? (
              <>
                {isCustomer && (
                  <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Cart, ${count} items`}>
                    <Link to="/cart">
                      <ShoppingCart className="size-[18px]" />
                      {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[10px] font-semibold text-background">{count}</span>}
                    </Link>
                  </Button>
                )}
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-1 grid size-8 place-items-center rounded-full border bg-accent text-xs font-semibold text-accent-foreground" aria-label="Account menu">{initials || <User className="size-4" />}</button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <p className="truncate text-sm">{user.firstName} {user.lastName}</p>
                      <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                      <span className="eyebrow mt-1 inline-block">{user.role}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/profile"><User className="size-4" />Profile</Link></DropdownMenuItem>
                    {isCustomer && <DropdownMenuItem asChild><Link to="/orders"><Receipt className="size-4" />My orders</Link></DropdownMenuItem>}
                    <DropdownMenuItem asChild><Link to="/notifications"><Bell className="size-4" />Notifications</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={logout}><LogOut className="size-4" />Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : mounted ? (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/auth/login" search={{ redirect: undefined }}>Sign in</Link></Button>
                <Button asChild size="sm"><Link to="/auth/register">Create account</Link></Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      {mounted && isCustomer && (
        <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
          {CUSTOMER_NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="size-5" aria-hidden />{label}
              </Link>
            );
          })}
        </nav>
      )}
      <footer className="hidden border-t md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
          <span>© OrderMesh</span>
          <span className="flex items-center gap-1.5 font-mono"><Package className="size-3.5" aria-hidden /> Order & fulfillment platform</span>
        </div>
      </footer>
    </div>
  );
}
