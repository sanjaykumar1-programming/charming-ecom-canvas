import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { makeStore, useAppDispatch, useAppSelector, type AppStore } from "./store";
import { registerAuthHooks } from "@/api/client";
import { notificationsApi, usersApi } from "@/api/endpoints";
import { tokenStorage } from "@/services/tokenStorage";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { hydrated, tokenRefreshed, userUpdated } from "@/store/auth/authSlice";
import { received, unreadCountSet } from "@/store/notification/notificationSlice";
import { endSession } from "@/features/auth/session";
import type { AppNotification } from "@/types/api";

let storeSingleton: AppStore | null = null;
export const getStore = () => (storeSingleton ??= makeStore());

export function AppProviders({ children }: { children: ReactNode }) {
  const [store] = useState(() => (typeof window === "undefined" ? makeStore() : getStore()));
  return (
    <Provider store={store}>
      <AuthBootstrap store={store} />
      <SocketBridge />
      {children}
    </Provider>
  );
}

function AuthBootstrap({ store }: { store: AppStore }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    registerAuthHooks({
      onTokens: (accessToken, refreshToken) => {
        const s = tokenStorage.get();
        tokenStorage.save({ accessToken, refreshToken, user: s?.user ?? null });
        store.dispatch(tokenRefreshed(accessToken));
      },
      onAuthFailure: () => {
        endSession(store, queryClient);
        toast.error("Your session has expired. Please sign in again.");
        void navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      },
    });

    const session = tokenStorage.load();
    store.dispatch(hydrated({ user: session?.user ?? null, accessToken: session?.accessToken ?? null }));
    if (session?.accessToken) {
      usersApi.me().then((u) => {
        store.dispatch(userUpdated(u));
        const cur = tokenStorage.get();
        if (cur) tokenStorage.save({ ...cur, user: u });
      }).catch(() => {});
    }
  }, [store, queryClient, navigate]);

  return null;
}

function SocketBridge() {
  const token = useAppSelector((s) => s.auth.accessToken);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    notificationsApi.unreadCount().then((c) => dispatch(unreadCountSet(c))).catch(() => {});

    const orderIdOf = (p: unknown) => {
      const o = p as { orderId?: string; id?: string; order?: { id?: string } } | null;
      return o?.orderId ?? o?.order?.id ?? o?.id;
    };
    const refreshOrder = (p: unknown) => {
      const id = orderIdOf(p);
      if (id) void queryClient.invalidateQueries({ queryKey: ["order", id] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    };

    connectSocket(token, {
      "notification.created": (p) => {
        const n = p as AppNotification;
        if (!n?.id) return;
        dispatch(received(n));
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast(n.title, { description: n.message });
      },
      "order.updated": (p) => {
        refreshOrder(p);
      },
      "payment.succeeded": (p) => {
        refreshOrder(p);
        toast.success("Payment successful", { description: "Your payment has been confirmed." });
      },
      "payment.failed": (p) => {
        refreshOrder(p);
        toast.error("Payment failed", { description: "Your payment could not be completed." });
      },
      status: () => {},
    });
  }, [token, dispatch, queryClient]);

  return null;
}
