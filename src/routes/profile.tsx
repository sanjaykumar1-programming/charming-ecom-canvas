import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequireAuth } from "@/components/common/RequireAuth";
import { ErrorState, PageHeader, RowsSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { authApi, usersApi } from "@/api/endpoints";
import { useAppDispatch } from "@/app/store";
import { getStore } from "@/app/providers";
import { userUpdated } from "@/store/auth/authSlice";
import { endSession } from "@/features/auth/session";
import { tokenStorage } from "@/services/tokenStorage";
import { errorMessage } from "@/utils/errors";
import { formatDate } from "@/utils/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — OrderMesh" },
      { name: "description", content: "Manage your OrderMesh account details and security." },
      { property: "og:title", content: "Profile — OrderMesh" },
      { property: "og:description", content: "Manage your OrderMesh account details and security." },
    ],
  }),
  component: () => <RequireAuth><ProfilePage /></RequireAuth>,
});

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(50),
  lastName: z.string().trim().min(1, "Required").max(50),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
});
const pwSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "At least 8 characters").max(128),
  confirm: z.string(),
}).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

function ProfilePage() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  const pf = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema) });
  useEffect(() => {
    if (me.data) pf.reset({ firstName: me.data.firstName, lastName: me.data.lastName, phone: me.data.phone ?? "" });
  }, [me.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (u) => {
      const merged = { ...me.data!, ...u };
      dispatch(userUpdated(merged));
      const s = tokenStorage.get();
      if (s) tokenStorage.save({ ...s, user: merged });
      qc.setQueryData(["me"], merged);
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const pw = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema) });
  const changePw = useMutation({
    mutationFn: (v: z.infer<typeof pwSchema>) => authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => { pw.reset({ currentPassword: "", newPassword: "", confirm: "" }); toast.success("Password changed"); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deactivate = useMutation({
    mutationFn: usersApi.deactivateMe,
    onSuccess: () => {
      endSession(getStore(), qc);
      toast.success("Your account has been deactivated");
      void navigate({ to: "/auth/login", search: { redirect: undefined }, replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  if (me.isPending) return <RowsSkeleton rows={4} />;
  const u = me.data;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Account" title="Profile" />
      <section className="panel mb-6 grid gap-4 p-5 sm:grid-cols-4">
        <Info label="Email" value={u.email} />
        <Info label="Role" value={u.role} mono />
        <div><p className="eyebrow">Status</p><div className="mt-1"><StatusBadge value={u.isActive === false ? "CANCELLED" : "SUCCESS"} label={u.isActive === false ? "Inactive" : "Active"} /></div></div>
        <Info label="Member since" value={formatDate(u.createdAt)} />
      </section>

      <form className="panel mb-6 p-5" onSubmit={pf.handleSubmit((v) => save.mutate(v))} noValidate>
        <h2 className="mb-4 font-medium">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="First name" error={pf.formState.errors.firstName?.message}><Input id="firstName" {...pf.register("firstName")} /></Field>
          <Field id="lastName" label="Last name" error={pf.formState.errors.lastName?.message}><Input id="lastName" {...pf.register("lastName")} /></Field>
          <Field id="phone" label="Phone" error={pf.formState.errors.phone?.message}><Input id="phone" type="tel" {...pf.register("phone")} /></Field>
        </div>
        <Button type="submit" className="mt-5" disabled={save.isPending || !pf.formState.isDirty}>
          {save.isPending && <Loader2 className="size-4 animate-spin" />}{save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <form className="panel mb-6 p-5" onSubmit={pw.handleSubmit((v) => changePw.mutate(v))} noValidate>
        <h2 className="mb-4 font-medium">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="currentPassword" label="Current password" error={pw.formState.errors.currentPassword?.message}><Input id="currentPassword" type="password" autoComplete="current-password" {...pw.register("currentPassword")} /></Field>
          <Field id="newPassword" label="New password" error={pw.formState.errors.newPassword?.message}><Input id="newPassword" type="password" autoComplete="new-password" {...pw.register("newPassword")} /></Field>
          <Field id="confirm" label="Confirm new password" error={pw.formState.errors.confirm?.message}><Input id="confirm" type="password" autoComplete="new-password" {...pw.register("confirm")} /></Field>
        </div>
        <Button type="submit" variant="outline" className="mt-5" disabled={changePw.isPending}>{changePw.isPending ? "Updating…" : "Update password"}</Button>
      </form>

      <section className="panel border-destructive/30 p-5">
        <h2 className="font-medium text-destructive">Deactivate account</h2>
        <p className="mt-1 text-sm text-muted-foreground">You'll be signed out and won't be able to sign in again.</p>
        <ConfirmDialog destructive title="Deactivate your account?" description="You will be signed out immediately. This can't be undone from your side."
          confirmLabel="Deactivate account" onConfirm={() => deactivate.mutate()} pending={deactivate.isPending}
          trigger={<Button variant="destructive" size="sm" className="mt-4" disabled={deactivate.isPending}>{deactivate.isPending ? "Deactivating…" : "Deactivate account"}</Button>} />
      </section>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="eyebrow">{label}</p><p className={`mt-1 truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}
function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
