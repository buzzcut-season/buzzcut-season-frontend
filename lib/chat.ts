import { getApiBaseUrl } from "./api";

export function getChatsWebSocketUrl(): string {
  const apiBase = new URL(getApiBaseUrl());
  apiBase.protocol = apiBase.protocol === "https:" ? "wss:" : "ws:";
  apiBase.pathname = "/ws/chats";
  apiBase.search = "";
  apiBase.hash = "";
  return apiBase.toString();
}
