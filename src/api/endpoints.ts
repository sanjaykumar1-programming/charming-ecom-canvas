/**
 * Typed service layer for the OrderMesh backend contract.
 * Every function maps 1:1 to an existing backend endpoint — no invented routes.
 */
import { api } from "./client";
import {
  toPage, unwrap,
  type AppNotification, type AuthTokens, type Cart, type Category, type CheckoutPayload,
  type Order, type Page, type Product, type User,
} from "@/types/api";

const d = <T,>(p: Promise<{ data: unknown }>) => p.then((r) => unwrap<T>(r.data));

/* ---------------- auth ---------------- */
export interface RegisterPayload { firstName: string; lastName: string; email: string; phone: string; password: string }
export interface LoginResult { tokens: AuthTokens | null; user: User | null }

function readAuth(raw: unknown): LoginResult {
  const b = (unwrap<Record<string, unknown>>(raw) ?? {}) as Record<string, unknown>;
  const t = (b.tokens ?? b) as Partial<AuthTokens>;
  return {
    tokens: t.accessToken ? { accessToken: t.accessToken, refreshToken: t.refreshToken } : null,
    user: (b.user as User) ?? null,
  };
}
export const authApi = {
  register: (p: RegisterPayload) => api.post("/auth/register", p).then((r) => readAuth(r.data)),
  login: (p: { email: string; password: string }) => api.post("/auth/login", p).then((r) => readAuth(r.data)),
  changePassword: (p: { currentPassword: string; newPassword: string }) => api.post("/auth/change-password", p),
};

/* ---------------- users ---------------- */
export const usersApi = {
  me: () => d<User>(api.get("/users/me")),
  updateMe: (p: Partial<Pick<User, "firstName" | "lastName" | "phone">>) => d<User>(api.patch("/users/me", p)),
  deactivateMe: () => api.delete("/users/me"),
};

/* ---------------- catalog ---------------- */
export interface ProductQuery { page?: number; limit?: number; search?: string; categoryId?: string }
export const productsApi = {
  list: (q: ProductQuery): Promise<Page<Product>> => {
    const params = Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ""));
    return api.get("/products", { params }).then((r) => toPage<Product>(r.data, { page: q.page ?? 1, limit: q.limit ?? 12 }));
  },
  get: (id: string) => d<Product>(api.get(`/products/${id}`)),
};
export const categoriesApi = {
  list: () => api.get("/categories").then((r) => toPage<Category>(r.data, { page: 1, limit: 100 }).items),
  get: (id: string) => d<Category>(api.get(`/categories/${id}`)),
};

/* ---------------- cart ---------------- */
function normCart(raw: unknown): Cart {
  const c = unwrap<Cart | null>(raw);
  return { ...(c ?? {}), items: c?.items ?? [] };
}
export const cartApi = {
  get: () => api.get("/cart").then((r) => normCart(r.data)),
  add: (p: { productId: string; quantity: number }) => api.post("/cart/items", p).then((r) => normCart(r.data)),
  update: (productId: string, quantity: number) => api.patch(`/cart/items/${productId}`, { quantity }).then((r) => normCart(r.data)),
  remove: (productId: string) => api.delete(`/cart/items/${productId}`).then((r) => normCart(r.data)),
  clear: () => api.delete("/cart"),
};

/* ---------------- orders & payments ---------------- */
export interface CheckoutResult { order: Order | null; payment: Record<string, unknown> | null; raw: unknown }
export const ordersApi = {
  checkout: (p: CheckoutPayload): Promise<CheckoutResult> =>
    api.post("/orders/checkout", p).then((r) => {
      const b = unwrap<Record<string, unknown>>(r.data) ?? {};
      const order = ((b.order ?? (b.id ? b : null)) as Order) ?? null;
      const payment = (b.payment ?? b.paymentIntent ?? order?.payment ?? null) as Record<string, unknown> | null;
      return { order, payment, raw: b };
    }),
  list: (q: { page: number; limit: number }) => api.get("/orders", { params: q }).then((r) => toPage<Order>(r.data, q)),
  get: (id: string) => d<Order>(api.get(`/orders/${id}`)),
  cancel: (id: string) => d<Order>(api.delete(`/orders/${id}`)),
};

/* ---------------- notifications ---------------- */
export const notificationsApi = {
  list: (q: { page: number; limit: number; isRead?: boolean }) =>
    api.get("/notifications", { params: q }).then((r) => toPage<AppNotification>(r.data, q)),
  unreadCount: () =>
    api.get("/notifications/unread-count").then((r) => {
      const b = unwrap<unknown>(r.data);
      return typeof b === "number" ? b : Number((b as { count?: number; unreadCount?: number })?.count ?? (b as { unreadCount?: number })?.unreadCount ?? 0);
    }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  remove: (id: string) => api.delete(`/notifications/${id}`),
};
