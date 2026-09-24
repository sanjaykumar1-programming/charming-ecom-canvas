import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, usersApi } from "@/api/endpoints";
import { getStore } from "@/app/providers";
import { startSession } from "@/features/auth/session";
import { tokenStorage } from "@/services/tokenStorage";
import { parseApiError } from "@/utils/errors";
import { AuthFrame } from "@/features/auth/AuthFrame";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" && s["redirect"].startsWith("/") ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — OrderMesh" },
      { name: "description", content: "Sign in to your OrderMesh account." },
      { property: "og:title", content: "Sign in — OrderMesh" },
      { property: "og:description", content: "Sign in to your OrderMesh account." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const { tokens, user } = await authApi.login(v);
      if (!tokens) throw new Error("Login response did not include an access token.");
      tokenStorage.save({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
      const me = user ?? (await usersApi.me());
      startSession(getStore(), tokens, me);
      void navigate({ to: redirect ?? "/", replace: true });
    } catch (e) {
      tokenStorage.clear();
      const pe = parseApiError(e);
      setError(pe.kind === "auth" ? "Invalid email or password." : pe.message);
    }
  });

  return (
    <AuthFrame title="Sign in" subtitle="Welcome back. Enter your credentials to continue.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}{isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to OrderMesh? <Link to="/auth/register" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
