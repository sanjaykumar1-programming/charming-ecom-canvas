import { createEntityAdapter, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { isRead, type AppNotification } from "@/types/api";

const adapter = createEntityAdapter<AppNotification>({
  sortComparer: (a, b) => b.createdAt.localeCompare(a.createdAt),
});

const slice = createSlice({
  name: "notifications",
  initialState: adapter.getInitialState({ unreadCount: 0 }),
  reducers: {
    /** History from the API — dedupe by id (upsert, never append blindly). */
    historyLoaded(state, a: PayloadAction<AppNotification[]>) {
      adapter.upsertMany(state, a.payload);
    },
    /** Realtime push — only counts toward unread when it's genuinely new. */
    received(state, a: PayloadAction<AppNotification>) {
      const exists = Boolean(state.entities[a.payload.id]);
      adapter.upsertOne(state, a.payload);
      if (!exists && !isRead(a.payload)) state.unreadCount += 1;
    },
    unreadCountSet(state, a: PayloadAction<number>) {
      state.unreadCount = Math.max(0, a.payload);
    },
    markedRead(state, a: PayloadAction<string>) {
      const n = state.entities[a.payload];
      if (n && !isRead(n)) {
        n.isRead = true;
        n.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    allMarkedRead(state) {
      Object.values(state.entities).forEach((n) => {
        if (n) { n.isRead = true; n.read = true; }
      });
      state.unreadCount = 0;
    },
    removed(state, a: PayloadAction<string>) {
      const n = state.entities[a.payload];
      if (n && !isRead(n)) state.unreadCount = Math.max(0, state.unreadCount - 1);
      adapter.removeOne(state, a.payload);
    },
    reset() {
      return adapter.getInitialState({ unreadCount: 0 });
    },
  },
});

export const { historyLoaded, received, unreadCountSet, markedRead, allMarkedRead, removed, reset } = slice.actions;
export const notificationSelectors = adapter.getSelectors();
export default slice.reducer;
