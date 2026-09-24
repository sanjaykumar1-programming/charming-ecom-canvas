import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, usersApi } from "@/api/endpoints";
import { getStore } from "@/app/providers";
import { startSession } from "@/features/auth/session";
import { tokenStorage } from "@/services/tokenStorage";
import { errorMessage } from "@/utils/errors";
import { AuthFrame } from "@/features/auth/AuthFrame";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Create account — OrderMesh" },
      { name: "description", content: "Create an OrderMesh account to shop and track orders." },
      { property: "og:title", content: "Create account — OrderMesh" },
      { property: "og:description", content: "Create an OrderMesh account to shop and track orders." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  firstName: z.string().trim().min(1, "Required").max(50),
  lastName: z.string().trim().min(1, "Required").max(50),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  password: z.string().min(8, "At least 8 characters").max(128),
});
type F = z.infer<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const { tokens, user } = await authApi.register(v);
      if (tokens) {
        tokenStorage.save({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
        startSession(getStore(), tokens, user ?? (await usersApi.me()));
        void navigate({ to: "/", replace: true });
      } else {
        setDone(true);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (done) {
    return (
      <AuthFrame title="Account created" subtitle="Your account is ready.">
        <div className="panel p-5 text-sm">
          <CheckCircle2 className="mb-2 size-5 text-success" />
          You can now sign in with your email and password.
        </div>
        <Button asChild className="mt-5 w-full"><Link to="/auth/login" search={{ redirect: undefined }}>Continue to sign in</Link></Button>
      </AuthFrame>
    );
  }

  const field = (name: keyof F, label: string, type = "text", auto?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} autoComplete={auto} aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <AuthFrame title="Create your account" subtitle="Shop the catalog and track every order in real time.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-3">{field("firstName", "First name", "text", "given-name")}{field("lastName", "Last name", "text", "family-name")}</div>
        {field("email", "Email", "email", "email")}
        {field("phone", "Phone", "tel", "tel")}
        {field("password", "Password", "password", "new-password")}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}{isSubmitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/auth/login" search={{ redirect: undefined }} className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
