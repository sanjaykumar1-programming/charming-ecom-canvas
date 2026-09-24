export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

/** Socket.IO namespace URL. Defaults to the API origin + /notifications. */
export const SOCKET_URL: string =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  (() => {
    try {
      return `${new URL(API_URL).origin}/notifications`;
    } catch {
      return "/notifications";
    }
  })();

export const ROLES = ["CUSTOMER", "WAREHOUSE", "OPERATIONS", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
