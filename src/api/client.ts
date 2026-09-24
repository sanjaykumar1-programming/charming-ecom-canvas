import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { API_URL } from "@/constants/config";
import { tokenStorage } from "@/services/tokenStorage";

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

type Hooks = { onTokens: (access: string, refresh?: string) => void; onAuthFailure: () => void };
let hooks: Hooks = { onTokens: () => {}, onAuthFailure: () => {} };
export const registerAuthHooks = (h: Hooks) => {
  hooks = h;
};

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()?.accessToken;
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const session = tokenStorage.get();
  if (!session?.refreshToken) return null;
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: session.refreshToken });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = res.data?.data ?? res.data;
    const tokens = (body.tokens ?? body) as { accessToken?: string; refreshToken?: string };
    if (!tokens.accessToken) return null;
    hooks.onTokens(tokens.accessToken, tokens.refreshToken ?? session.refreshToken);
    return tokens.accessToken;
  } catch {
    return null;
  }
}

const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? "";
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH.some((p) => url.includes(p)) &&
      tokenStorage.get()?.accessToken
    ) {
      original._retried = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` };
        return api(original);
      }
      hooks.onAuthFailure();
    }
    return Promise.reject(error);
  },
);
