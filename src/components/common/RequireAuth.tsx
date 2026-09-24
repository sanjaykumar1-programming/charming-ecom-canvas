import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/app/store";
import type { Role } from "@/constants/config";
import { Button } from "@/components/ui/button";
import { RowsSkeleton } from "./states";

/**
 * UX-only guard. The backend remains the authority — 401/403 from the API are
 * handled by the API client and ErrorState.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === "ready" && !user) {
      void navigate({ to: "/auth/login", search: { redirect: location.pathname }, replace: true });
    }
  }, [status, user, navigate, location.pathname]);

  if (status === "booting" || !user) return <div className="mx-auto max-w-5xl px-4 py-10"><RowsSkeleton rows={4} /></div>;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldOff className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">This area isn't available for your role</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as {user.role.toLowerCase()}.</p>
        <Button asChild variant="outline" className="mt-5"><Link to="/">Go to home</Link></Button>
      </div>
    );
  }
  return <>{children}</>;
}
