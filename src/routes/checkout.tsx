import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState } from "react";
import { Loader2, Lock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RequireAuth } from "@/components/common/RequireAuth";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton } from "@/components/common/states";
import { ordersApi } from "@/api/endpoints";
import { useAuth } from "@/app/store";
import { CART_KEY, cartTotal, useCart } from "@/features/cart/useCart";
import { savePaymentHandoff } from "@/features/checkout/paymentHandoff";
import { itemUnit } from "@/types/api";
import { formatMoney } from "@/utils/format";
import { parseApiError } from "@/utils/errors";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — OrderMesh" },
      { name: "description", content: "Confirm shipping details and place your order." },
      { property: "og:title", content: "Checkout — OrderMesh" },
      { property: "og:description", content: "Confirm shipping details and place your order." },
    ],
  }),
  component: () => <RequireAuth roles={["CUSTOMER"]}><CheckoutPage /></RequireAuth>,
});

const schema = z.object({
  name: z.string().trim().min(2, "Required").max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  addressLine1: z.string().trim().min(3, "Required").max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, "Required").max(100),
  state: z.string().trim().min(2, "Required").max(100),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{4,10}$/, "Enter a valid postal code"),
  country: z.string().trim().min(2, "Required").max(60),
  notes: z.string().trim().max(500).optional(),
});
type F = z.infer<typeof schema>;

function CheckoutPage() {
  const { user } = useAuth();
  const cart = useCart();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const lock = useRef(false);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { name: user ? `${user.firstName} ${user.lastName}` : "", phone: user?.phone ?? "", country: "India" },
  });

  const checkout = useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: CART_KEY });
      void qc.invalidateQueries({ queryKey: ["orders"] });
      if (!res.order?.id) {
        toast.success("Order placed");
        return navigate({ to: "/orders", search: {} });
      }
      savePaymentHandoff(res.order.id, res.payment);
      return navigate({ to: "/payment/$orderId", params: { orderId: res.order.id }, replace: true });
    },
    onError: (e) => {
      lock.current = false;
      const pe = parseApiError(e);
      if (pe.kind === "conflict" || pe.kind === "notfound") {
        setErr(`Some items are no longer available. Please review your cart. (${pe.message})`);
        void qc.invalidateQueries({ queryKey: CART_KEY });
      } else setErr(pe.message);
    },
  });

  const onSubmit = handleSubmit((v) => {
    if (lock.current || checkout.isPending) return;
    lock.current = true;
    setErr(null);
    const { notes, addressLine2, ...addr } = v;
    checkout.mutate({
      shippingAddress: { ...addr, ...(addressLine2 ? { addressLine2 } : {}) },
      ...(notes ? { notes } : {}),
    });
  });

  const items = cart.data?.items ?? [];
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => cart.refetch()} />;
  if (cart.isPending) return <RowsSkeleton rows={4} />;
  if (items.length === 0 && !checkout.isPending && !checkout.isSuccess)
    return <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add products before checking out." action={<Button asChild><Link to="/products" search={{}}>Browse products</Link></Button>} />;

  const f = (name: keyof F, label: string, auto?: string, cls = "") => (
    <div className={`space-y-1.5 ${cls}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} autoComplete={auto} aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Step 2 of 3" title="Checkout" description="Confirm where we should deliver your order." />
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]" noValidate>
        <section className="panel p-5" aria-labelledby="ship">
          <h2 id="ship" className="mb-4 font-medium">Shipping address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {f("name", "Full name", "name")}{f("phone", "Phone", "tel")}
            {f("addressLine1", "Address line 1", "address-line1", "sm:col-span-2")}
            {f("addressLine2", "Address line 2 (optional)", "address-line2", "sm:col-span-2")}
            {f("city", "City", "address-level2")}{f("state", "State", "address-level1")}
            {f("postalCode", "Postal code", "postal-code")}{f("country", "Country", "country-name")}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Delivery notes (optional)</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </div>
        </section>
        <aside className="panel h-fit p-5">
          <p className="eyebrow">Order summary</p>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span className="truncate">{i.product?.name ?? "Product"} <span className="text-muted-foreground">× {i.quantity}</span></span>
                <span className="font-mono">{formatMoney(itemUnit(i) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t pt-3"><span className="font-medium">Total</span><span className="font-mono font-semibold">{formatMoney(cartTotal(cart.data))}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">The payable amount is confirmed by the server.</p>
          <label className="mt-5 flex items-start gap-2 text-sm">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
            <span>I confirm my order and shipping details are correct.</span>
          </label>
          {err && <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{err} <Link to="/cart" className="underline">Review cart</Link></p>}
          <Button type="submit" className="mt-5 w-full" disabled={!agree || checkout.isPending}>
            {checkout.isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {checkout.isPending ? "Checking out…" : "Place order"}
          </Button>
        </aside>
      </form>
    </>
  );
}
