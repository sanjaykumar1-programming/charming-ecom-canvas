import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/constants/config";
import { tokenStorage } from "./tokenStorage";

export type SocketHandlers = {
  "notification.created": (p: unknown) => void;
  "order.updated": (p: unknown) => void;
  "payment.succeeded": (p: unknown) => void;
  "payment.failed": (p: unknown) => void;
  status: (s: "connected" | "disconnected" | "error") => void;
};

let socket: Socket | null = null;
let currentToken: string | null = null;
let onlineListenersBound = false;

function bindNetworkListeners() {
  if (onlineListenersBound || typeof window === "undefined") return;
  onlineListenersBound = true;
  window.addEventListener("offline", () => socket?.disconnect());
  window.addEventListener("online", () => {
    if (socket && !socket.connected) socket.connect();
  });
}

/** Single connection per session. The server resolves the user from the JWT — never send userId. */
export function connectSocket(token: string, handlers: SocketHandlers) {
  if (socket && currentToken === token) return;
  disconnectSocket();
  currentToken = token;
  bindNetworkListeners();

  socket = io(SOCKET_URL, {
    // Function form: every reconnect uses the freshest access token.
    auth: (cb) => cb({ token: tokenStorage.get()?.accessToken ?? token }),
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 15000,
  });

  socket.on("connect", () => handlers.status("connected"));
  socket.on("disconnect", () => handlers.status("disconnected"));
  socket.on("connect_error", () => handlers.status("error"));
  socket.io.on("reconnect", () => handlers.status("connected"));
  socket.on("notification.created", handlers["notification.created"]);
  socket.on("order.updated", handlers["order.updated"]);
  socket.on("payment.succeeded", handlers["payment.succeeded"]);
  socket.on("payment.failed", handlers["payment.failed"]);
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
}
