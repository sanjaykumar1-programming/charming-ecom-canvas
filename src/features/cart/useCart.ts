import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cartApi } from "@/api/endpoints";
import { useAuth } from "@/app/store";
import { itemUnit, type Cart } from "@/types/api";
import { errorMessage } from "@/utils/errors";

export const CART_KEY = ["cart"] as const;

export function useCart() {
  const { user } = useAuth();
  return useQuery({ queryKey: CART_KEY, queryFn: cartApi.get, enabled: user?.role === "CUSTOMER" });
}

export const cartCount = (c?: Cart) => (c?.items ?? []).reduce((n, i) => n + i.quantity, 0);
/** Integer-cents subtotal for display only — the backend total always wins when present. */
export const cartTotal = (c?: Cart) =>
  c?.totalInCents ?? (c?.items ?? []).reduce((s, i) => s + itemUnit(i) * i.quantity, 0);

export function useCartMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: CART_KEY });
  const onError = (e: unknown) => toast.error(errorMessage(e));
  return {
    add: useMutation({
      mutationFn: cartApi.add,
      onSuccess: () => { toast.success("Added to cart"); return done(); },
      onError,
    }),
    update: useMutation({
      mutationFn: (v: { productId: string; quantity: number }) => cartApi.update(v.productId, v.quantity),
      onSuccess: done,
      onError: (e) => { onError(e); void done(); },
    }),
    remove: useMutation({ mutationFn: cartApi.remove, onSuccess: done, onError }),
    clear: useMutation({ mutationFn: cartApi.clear, onSuccess: () => { toast.success("Cart cleared"); return done(); }, onError }),
  };
}
