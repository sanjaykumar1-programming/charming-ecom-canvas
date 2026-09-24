import { AxiosError } from "axios";

export interface ApiError {
  status: number | null;
  message: string;
  kind: "network" | "validation" | "auth" | "forbidden" | "notfound" | "conflict" | "ratelimit" | "server" | "unknown";
}

const DEFAULTS: Record<ApiError["kind"], string> = {
  network: "Unable to connect to server. Please check your internet connection and try again.",
  validation: "Some of the information provided is invalid.",
  auth: "Your session has expired. Please sign in again.",
  forbidden: "You are not authorized to perform this action.",
  notfound: "The requested resource was not found.",
  conflict: "This action conflicts with the current state.",
  ratelimit: "Too many attempts. Please wait a moment and try again.",
  server: "Something went wrong on the server. Please try again later.",
  unknown: "Something went wrong.",
};

export function parseApiError(err: unknown): ApiError {
  if (err instanceof AxiosError) {
    if (!err.response) return { status: null, kind: "network", message: DEFAULTS.network };
    const status = err.response.status;
    const data = err.response.data as { message?: string | string[] } | undefined;
    const raw = Array.isArray(data?.message) ? data?.message.join(", ") : data?.message;
    const kind: ApiError["kind"] =
      status === 400 || status === 422 ? "validation"
      : status === 401 ? "auth"
      : status === 403 ? "forbidden"
      : status === 404 ? "notfound"
      : status === 409 ? "conflict"
      : status === 429 ? "ratelimit"
      : status >= 500 ? "server" : "unknown";
    const safe = kind === "server" ? DEFAULTS.server : raw || DEFAULTS[kind];
    return { status, kind, message: safe };
  }
  return { status: null, kind: "unknown", message: err instanceof Error ? err.message : DEFAULTS.unknown };
}

export const errorMessage = (err: unknown) => parseApiError(err).message;

/** Only retry safe reads on network/5xx, never on 4xx. */
export function shouldRetryQuery(failureCount: number, err: unknown) {
  const e = parseApiError(err);
  return failureCount < 2 && (e.kind === "network" || e.kind === "server");
}
