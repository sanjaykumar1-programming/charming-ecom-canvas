import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/api";

export interface AuthState {
  status: "booting" | "ready";
  user: User | null;
  accessToken: string | null;
}

const initialState: AuthState = { status: "booting", user: null, accessToken: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrated(state, a: PayloadAction<{ user: User | null; accessToken: string | null }>) {
      state.status = "ready";
      state.user = a.payload.user;
      state.accessToken = a.payload.accessToken;
    },
    sessionStarted(state, a: PayloadAction<{ user: User; accessToken: string }>) {
      state.status = "ready";
      state.user = a.payload.user;
      state.accessToken = a.payload.accessToken;
    },
    tokenRefreshed(state, a: PayloadAction<string>) {
      state.accessToken = a.payload;
    },
    userUpdated(state, a: PayloadAction<User>) {
      state.user = a.payload;
    },
    loggedOut(state) {
      state.status = "ready";
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { hydrated, sessionStarted, tokenRefreshed, userUpdated, loggedOut } = authSlice.actions;
export default authSlice.reducer;
