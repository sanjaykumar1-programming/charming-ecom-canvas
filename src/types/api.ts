import type { Role } from "@/constants/config";

export type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PAYMENT_PENDING" | "PAID" | "PROCESSING"
  | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type PaymentAttemptStatus =
  | "CREATED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";
export type NotificationType =
  | "ORDER_CREATED" | "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "ORDER_PROCESSING"
  | "ORDER_PACKED" | "ORDER_SHIPPED" | "ORDER_DELIVERED" | "ORDER_CANCELLED"
  | "INVENTORY_ALERT" | "SYSTEM";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug?: string;
  description?: string | null;
  priceInCents: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  isActive?: boolean;
  inventory?: { availableQuantity?: number; reservedQuantity?: number; status?: string } | null;
  createdAt?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  unitPriceInCents?: number;
  priceInCents?: number;
  product?: Product;
}
export interface Cart {
  id?: string;
  items: CartItem[];
  totalInCents?: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
export interface CheckoutPayload {
  shippingAddress: ShippingAddress;
  notes?: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  quantity: number;
  unitPriceInCents?: number;
  priceInCents?: number;
  totalInCents?: number;
  productName?: string;
  sku?: string;
  product?: Product;
}
export interface Payment {
  id?: string;
  status?: PaymentStatus;
  provider?: string;
  amountInCents?: number;
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  attempts?: { id: string; status: PaymentAttemptStatus; createdAt?: string }[];
}
export interface Order {
  id: string;
  orderNumber?: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  totalAmountInCents?: number;
  totalInCents?: number;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  notes?: string | null;
  payment?: Payment | null;
  payments?: Payment[];
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead?: boolean;
  read?: boolean;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ---------- Response normalizers (tolerant of common NestJS shapes) ---------- */

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj => !!v && typeof v === "object" && !Array.isArray(v);

/** Unwraps `{ success, data }` / `{ statusCode, data }` envelopes. */
export function unwrap<T>(raw: unknown): T {
  if (isObj(raw) && "data" in raw && ("success" in raw || "statusCode" in raw || "message" in raw)) {
    return raw.data as T;
  }
  return raw as T;
}

export function toPage<T>(raw: unknown, fallback: { page: number; limit: number }): Page<T> {
  const r = unwrap<unknown>(raw);
  if (Array.isArray(r)) {
    return { items: r as T[], total: r.length, page: fallback.page, limit: fallback.limit, totalPages: 1 };
  }
  if (isObj(r)) {
    const items = (r.items ?? r.data ?? r.results ?? r.rows ?? []) as T[];
    const meta = (isObj(r.meta) ? r.meta : isObj(r.pagination) ? r.pagination : r) as AnyObj;
    const total = Number(meta.total ?? meta.totalItems ?? meta.count ?? items.length);
    const limit = Number(meta.limit ?? meta.pageSize ?? meta.perPage ?? fallback.limit);
    const page = Number(meta.page ?? meta.currentPage ?? fallback.page);
    const totalPages = Number(meta.totalPages ?? meta.pages ?? Math.max(1, Math.ceil(total / (limit || 1))));
    return { items: Array.isArray(items) ? items : [], total, page, limit, totalPages };
  }
  return { items: [], total: 0, page: fallback.page, limit: fallback.limit, totalPages: 1 };
}

export const orderTotal = (o: Order) => o.totalAmountInCents ?? o.totalInCents ?? 0;
export const itemUnit = (i: CartItem | OrderItem) =>
  i.unitPriceInCents ?? i.priceInCents ?? i.product?.priceInCents ?? 0;
export const isRead = (n: AppNotification) => Boolean(n.isRead ?? n.read);
export const orderPayment = (o: Order): Payment | undefined =>
  o.payment ?? (o.payments && o.payments.length ? o.payments[o.payments.length - 1] : undefined);
export const productImage = (p?: Product) =>
  (p as (Product & { image?: string; images?: string[] }) | undefined)?.imageUrl ??
  (p as { image?: string } | undefined)?.image ??
  (p as { images?: string[] } | undefined)?.images?.[0] ??
  null;
