import { getApiBaseUrl } from "./api";

export function buildChatKey(currentUserId: number, otherUserId: number): string {
  return `users_${Math.min(currentUserId, otherUserId)}_${Math.max(currentUserId, otherUserId)}`;
}

export function getChatsWebSocketUrl(): string {
  const apiBase = new URL(getApiBaseUrl());
  apiBase.protocol = apiBase.protocol === "https:" ? "wss:" : "ws:";
  apiBase.pathname = "/ws/chats";
  apiBase.search = "";
  apiBase.hash = "";
  return apiBase.toString();
}
