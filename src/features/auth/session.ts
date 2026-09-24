import type { QueryClient } from "@tanstack/react-query";
import type { AppStore } from "@/app/store";
import { loggedOut, sessionStarted } from "@/store/auth/authSlice";
import { reset as resetNotifications } from "@/store/notification/notificationSlice";
import { disconnectSocket } from "@/services/socket";
import { tokenStorage } from "@/services/tokenStorage";
import type { AuthTokens, User } from "@/types/api";

export function startSession(store: AppStore, tokens: AuthTokens, user: User) {
  tokenStorage.save({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
  store.dispatch(sessionStarted({ user, accessToken: tokens.accessToken }));
}

/** Clears tokens, user, cached private data, and the realtime connection. */
export function endSession(store: AppStore, queryClient: QueryClient) {
  disconnectSocket();
  tokenStorage.clear();
  void queryClient.cancelQueries();
  queryClient.removeQueries({ predicate: (q) => !["products", "product", "categories"].includes(String(q.queryKey[0])) });
  store.dispatch(resetNotifications());
  store.dispatch(loggedOut());
}
