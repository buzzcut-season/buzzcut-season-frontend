"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Loader2, Send, Wifi, WifiOff } from "lucide-react";
import { ApiHttpError, asErrorMessage, getAccountMe, getChatMessages, refreshAccessToken } from "@/lib/api";
import { buildChatKey, getChatsWebSocketUrl } from "@/lib/chat";
import {
  ACCOUNT_PROFILE_UPDATED_EVENT,
  clearAccountProfile,
  clearAuth,
  readAccountProfile,
  readAuth,
  writeAccountProfile,
} from "@/lib/storage";
import type { AccountMe, ChatMessage } from "@/lib/types";

type PairChatProps = {
  isAuthed: boolean;
  otherUserId?: number | null;
  chatKeyOverride?: string | null;
  otherUserLabel: string;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  className?: string;
};

type UiChatMessage = ChatMessage & {
  localId: string;
  pending: "sent" | "sending" | "failed";
};

type ChatFrame = {
  command: string;
  headers: Record<string, string>;
  body: string;
};

function buildFrame(command: string, headers: Record<string, string>, body = ""): string {
  const lines = [command, ...Object.entries(headers).map(([key, value]) => `${key}:${value}`), "", body];
  return `${lines.join("\n")}\0`;
}

function parseFrame(raw: string): ChatFrame | null {
  const normalized = raw.replace(/^\n+/, "");
  if (!normalized.trim()) return null;

  const separatorIndex = normalized.indexOf("\n\n");
  const head = separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : normalized;
  const body = separatorIndex >= 0 ? normalized.slice(separatorIndex + 2) : "";
  const [command, ...headerLines] = head.split("\n");
  if (!command) return null;

  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex <= 0) continue;
    headers[line.slice(0, colonIndex)] = line.slice(colonIndex + 1);
  }

  return { command, headers, body };
}

function mergeMessages(current: UiChatMessage[], incoming: UiChatMessage[]): UiChatMessage[] {
  const byServerId = new Map<number, UiChatMessage>();
  const byClientMessageId = new Map<string, UiChatMessage>();
  const ordered: UiChatMessage[] = [];

  const upsert = (message: UiChatMessage) => {
    const existingByServerId = message.id != null ? byServerId.get(message.id) : undefined;
    const existingByClientId = message.clientMessageId ? byClientMessageId.get(message.clientMessageId) : undefined;
    const existing = existingByServerId ?? existingByClientId;

    if (!existing) {
      ordered.push(message);
      if (message.id != null) {
        byServerId.set(message.id, message);
      }
      if (message.clientMessageId) {
        byClientMessageId.set(message.clientMessageId, message);
      }
      return;
    }

    const merged: UiChatMessage = {
      ...existing,
      ...message,
      localId: existing.localId,
      pending: message.pending === "sent" ? "sent" : existing.pending,
    };

    const index = ordered.findIndex((item) => item.localId === existing.localId);
    if (index >= 0) {
      ordered[index] = merged;
    }
    if (existing.id != null) {
      byServerId.delete(existing.id);
    }
    if (existing.clientMessageId) {
      byClientMessageId.delete(existing.clientMessageId);
    }
    if (merged.id != null) {
      byServerId.set(merged.id, merged);
    }
    if (merged.clientMessageId) {
      byClientMessageId.set(merged.clientMessageId, merged);
    }
  };

  for (const message of current) {
    upsert(message);
  }
  for (const message of incoming) {
    upsert(message);
  }

  return ordered.sort((left, right) => {
    if (left.id !== right.id) {
      return left.id - right.id;
    }
    return Date.parse(left.createdAt) - Date.parse(right.createdAt);
  });
}

function toUiMessage(message: ChatMessage, pending: UiChatMessage["pending"] = "sent"): UiChatMessage {
  return {
    ...message,
    localId: message.clientMessageId || `${message.id}`,
    pending,
  };
}

function formatMessageTimestamp(value: string): string {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleString();
}

export function PairChat({
  isAuthed,
  otherUserId,
  chatKeyOverride,
  otherUserLabel,
  title,
  emptyTitle,
  emptyDescription,
  className,
}: PairChatProps) {
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursorMessageId, setNextCursorMessageId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [socketError, setSocketError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionIdRef = useRef(`sub-${Math.random().toString(36).slice(2)}`);
  const receiveBufferRef = useRef("");
  const connectedRef = useRef(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cached = readAccountProfile();
    if (cached) {
      setAccount(cached);
      setAccountLoading(false);
    }

    if (!isAuthed || !readAuth()?.accessToken) {
      setAccount(null);
      setAccountLoading(false);
      setAccountError("Sign in to use chat.");
      return;
    }

    let cancelled = false;

    const syncAccount = async () => {
      setAccountLoading(true);
      setAccountError(null);
      try {
        const profile = await getAccountMe();
        if (cancelled) return;
        setAccount(profile);
        writeAccountProfile(profile);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiHttpError && (error.status === 401 || error.status === 403)) {
          clearAuth();
          clearAccountProfile();
          setAccount(null);
          setAccountError("Sign in to use chat.");
          return;
        }
        setAccountError(asErrorMessage(error));
      } finally {
        if (!cancelled) {
          setAccountLoading(false);
        }
      }
    };

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<AccountMe | undefined>).detail;
      setAccount(detail ?? readAccountProfile());
      setAccountLoading(false);
    }

    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    void syncAccount();

    return () => {
      cancelled = true;
      window.removeEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, [isAuthed]);

  const currentUserId = account?.id ?? null;
  const chatKey = useMemo(() => {
    if (chatKeyOverride?.trim()) {
      return chatKeyOverride.trim();
    }
    if (currentUserId == null || !Number.isInteger(otherUserId) || otherUserId <= 0) {
      return null;
    }
    return buildChatKey(currentUserId, otherUserId);
  }, [chatKeyOverride, currentUserId, otherUserId]);

  const loadHistory = useCallback(
    async (beforeMessageId?: number) => {
      if (!chatKey) return;

      const setLoadingState = beforeMessageId == null ? setHistoryLoading : setLoadingMore;
      const setErrorState = beforeMessageId == null ? setHistoryError : () => undefined;

      setLoadingState(true);
      setErrorState(null);

      try {
        const response = await getChatMessages(chatKey, {
          size: 50,
          ...(beforeMessageId != null ? { beforeMessageId } : {}),
        });

        setNextCursorMessageId(response.nextCursorMessageId);
        setMessages((current) => mergeMessages(current, response.items.map((item) => toUiMessage(item))));
      } catch (error) {
        setErrorState(asErrorMessage(error));
      } finally {
        setLoadingState(false);
      }
    },
    [chatKey],
  );

  useEffect(() => {
    setMessages([]);
    setNextCursorMessageId(null);
    setHistoryError(null);
    setSendError(null);
    setSocketError(null);

    if (!chatKey) return;
    void loadHistory();
  }, [chatKey, loadHistory]);

  useEffect(() => {
    if (!chatKey || !isAuthed) return;
    if (!readAuth()?.accessToken) return;

    let cancelled = false;
    let heartbeatId: number | null = null;

    const connect = async () => {
      setSocketState("connecting");
      setSocketError(null);

      let accessToken = readAuth()?.accessToken ?? null;
      if (!accessToken) {
        setSocketState("error");
        setSocketError("Sign in to use chat.");
        return;
      }

      const socket = new WebSocket(getChatsWebSocketUrl());
      socketRef.current = socket;
      receiveBufferRef.current = "";
      connectedRef.current = false;

      socket.onopen = () => {
        const currentToken = readAuth()?.accessToken ?? accessToken;
        if (!currentToken) {
          socket.close();
          return;
        }

        accessToken = currentToken;
        socket.send(
          buildFrame("CONNECT", {
            Authorization: `Bearer ${accessToken}`,
            "accept-version": "1.2",
            "heart-beat": "10000,10000",
          }),
        );
      };

      socket.onmessage = (event) => {
        receiveBufferRef.current += typeof event.data === "string" ? event.data : "";

        let endIndex = receiveBufferRef.current.indexOf("\0");
        while (endIndex >= 0) {
          const rawFrame = receiveBufferRef.current.slice(0, endIndex);
          receiveBufferRef.current = receiveBufferRef.current.slice(endIndex + 1);
          endIndex = receiveBufferRef.current.indexOf("\0");

          const frame = parseFrame(rawFrame);
          if (!frame) continue;

          if (frame.command === "CONNECTED") {
            connectedRef.current = true;
            setSocketState("connected");
            socket.send(
              buildFrame("SUBSCRIBE", {
                id: subscriptionIdRef.current,
                destination: `/topic/chats/${chatKey}`,
              }),
            );
            heartbeatId = window.setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send("\n");
              }
            }, 10000);
            continue;
          }

          if (frame.command === "MESSAGE") {
            try {
              const payload = JSON.parse(frame.body) as ChatMessage;
              setMessages((current) => mergeMessages(current, [toUiMessage(payload)]));
            } catch {
              setSocketError("Received malformed chat message.");
              setSocketState("error");
            }
            continue;
          }

          if (frame.command === "ERROR") {
            setSocketState("error");
            setSocketError(frame.body || "Chat connection was rejected.");
            if (/403|Access denied/i.test(frame.body)) {
              setHistoryError(frame.body || "Access denied.");
            }
          }
        }
      };

      socket.onerror = async () => {
        if (cancelled) return;
        if (!connectedRef.current) {
          const refreshedToken = await refreshAccessToken();
          if (cancelled || !refreshedToken) {
            setSocketState("error");
            setSocketError("Failed to connect to chat.");
            return;
          }
        }
        setSocketState("error");
        setSocketError("Failed to connect to chat.");
      };

      socket.onclose = () => {
        if (heartbeatId != null) {
          window.clearInterval(heartbeatId);
        }
        if (cancelled) return;
        connectedRef.current = false;
        setSocketState("error");
        setSocketError("Chat connection closed.");
      };
    };

    void connect();

    return () => {
      cancelled = true;
      connectedRef.current = false;
      if (heartbeatId != null) {
        window.clearInterval(heartbeatId);
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(buildFrame("DISCONNECT", {}));
      }
      socketRef.current?.close();
      socketRef.current = null;
      setSocketState("idle");
    };
  }, [chatKey, isAuthed]);

  useEffect(() => {
    const element = chatBodyRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!chatKey || currentUserId == null || !account) return;

      const body = draft.trim();
      if (!body) return;

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !connectedRef.current) {
        setSendError("Chat is not connected yet.");
        return;
      }

      const clientMessageId = crypto.randomUUID();
      const optimisticMessage: UiChatMessage = {
        id: Number.MAX_SAFE_INTEGER - messages.length,
        clientMessageId,
        userId: currentUserId,
        name: account.nickname,
        body,
        createdAt: new Date().toISOString(),
        localId: clientMessageId,
        pending: "sending",
      };

      setDraft("");
      setSendError(null);
      setMessages((current) => mergeMessages(current, [optimisticMessage]));

      try {
        socket.send(
          buildFrame(
            "SEND",
            {
              destination: `/app/ws/chats/${chatKey}/send`,
              "content-type": "application/json",
            },
            JSON.stringify({
              clientMessageId,
              body,
            }),
          ),
        );

        window.setTimeout(() => {
          setMessages((current) =>
            current.map((message) =>
              message.clientMessageId === clientMessageId && message.pending === "sending"
                ? { ...message, pending: "failed" }
                : message,
            ),
          );
        }, 15000);
      } catch (error) {
        setSendError(asErrorMessage(error));
        setMessages((current) =>
          current.map((message) =>
            message.clientMessageId === clientMessageId ? { ...message, pending: "failed" } : message,
          ),
        );
      }
    },
    [account, chatKey, currentUserId, draft, messages.length],
  );

  return (
    <section className={`card overflow-hidden p-5 ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-zinc-300/80">{title}</div>
          <div className="mt-2 text-sm text-zinc-400">
            {chatKey ? `chatKey: ${chatKey}` : `Chat with ${otherUserLabel}`}
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
            socketState === "connected"
              ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
              : socketState === "connecting"
                ? "border border-amber-300/25 bg-amber-400/10 text-amber-200"
                : "border border-white/10 bg-white/5 text-zinc-300"
          }`}
        >
          {socketState === "connected" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span>{socketState === "connected" ? "Live" : socketState === "connecting" ? "Connecting" : "Offline"}</span>
        </div>
      </div>

      {accountLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading chat account...
        </div>
      ) : accountError ? (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-200">
          {accountError}
        </div>
      ) : (
        <>
          {historyError ? (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-200">
              {historyError}
            </div>
          ) : null}
          {socketError ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{socketError}</span>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20">
            {nextCursorMessageId != null ? (
              <div className="border-b border-white/10 p-3">
                <button className="btn w-full" type="button" onClick={() => void loadHistory(nextCursorMessageId)} disabled={loadingMore}>
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading older messages...
                    </>
                  ) : (
                    "Load older messages"
                  )}
                </button>
              </div>
            ) : null}

            <div ref={chatBodyRef} className="max-h-[420px] min-h-[260px] space-y-3 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : messages.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center px-4 text-center text-sm text-zinc-400">
                  <div>
                    <div className="font-medium text-zinc-200">{emptyTitle}</div>
                    <div className="mt-2">{emptyDescription}</div>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const ownMessage = message.userId === currentUserId;
                  return (
                    <div key={message.localId} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          ownMessage
                            ? "border border-pink-400/20 bg-gradient-to-br from-pink-500/20 to-violet-500/15 text-zinc-50"
                            : "border border-white/10 bg-white/5 text-zinc-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-xs text-zinc-400">
                          <span>{ownMessage ? "You" : message.name || otherUserLabel}</span>
                          <span>{formatMessageTimestamp(message.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words">{message.body}</p>
                        {message.pending !== "sent" ? (
                          <div
                            className={`mt-2 text-[11px] ${
                              message.pending === "failed" ? "text-red-200" : "text-zinc-400"
                            }`}
                          >
                            {message.pending === "failed" ? "Failed to send" : "Sending..."}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form className="border-t border-white/10 p-4" onSubmit={onSubmit}>
              <div className="flex gap-3">
                <textarea
                  className="input min-h-24 resize-y"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${otherUserLabel}`}
                  maxLength={4000}
                />
                <button
                  className="btn btn-primary self-end"
                  type="submit"
                  disabled={!draft.trim() || socketState !== "connected"}
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
              {sendError ? <div className="mt-2 text-xs text-red-200">{sendError}</div> : null}
            </form>
          </div>
        </>
      )}
    </section>
  );
}
