import type { User } from "@/types/api";

const KEY = "ordermesh.session";

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  user: User | null;
}

let memory: StoredSession | null = null;

export const tokenStorage = {
  load(): StoredSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      memory = raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      memory = null;
    }
    return memory;
  },
  get(): StoredSession | null {
    return memory;
  },
  save(s: StoredSession) {
    memory = s;
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(s));
  },
  clear() {
    memory = null;
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  },
};
