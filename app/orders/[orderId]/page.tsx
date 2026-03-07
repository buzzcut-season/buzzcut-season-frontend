"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import { asErrorMessage, getOrder, getOrderChatMessages, payOrder } from "@/lib/api";
import { readAuth } from "@/lib/storage";
import type { ChatMessage, OrderResponse } from "@/lib/types";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

type CurrencyCode = "RUB" | "USD" | "EUR";

type StompFrame = {
  command: string;
  headers: Record<string, string>;
  body: string;
};

function formatPrice(value: string | null | undefined, currency: string): string {
  if (!value) return "Price unavailable";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function toWsUrl(apiBase: string): string {
  const base = new URL(apiBase);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws/order-chat";
  base.search = "";
  base.hash = "";
  return base.toString();
}

function parseStompFrame(raw: string): StompFrame | null {
  const normalized = raw.replace(/\r\n/g, "\n");
  const splitAt = normalized.indexOf("\n\n");
  if (splitAt < 0) return null;

  const head = normalized.slice(0, splitAt);
  const body = normalized.slice(splitAt + 2);
  const lines = head.split("\n");
  const command = lines[0]?.trim();
  if (!command) return null;

  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
  }

  return { command, headers, body };
}

function serializeStompFrame(command: string, headers: Record<string, string>, body = ""): string {
  const head = Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");
  return `${command}\n${head}\n\n${body}\u0000`;
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<number, ChatMessage>();
  for (const item of prev) {
    map.set(item.id, item);
  }
  for (const item of incoming) {
    map.set(item.id, item);
  }

  return Array.from(map.values()).sort((a, b) => {
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    if (Number.isNaN(ta) || Number.isNaN(tb)) {
      return a.id - b.id;
    }
    if (ta === tb) return a.id - b.id;
    return ta - tb;
  });
}

export default function OrderPage({ params }: PageProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const [resolvedOrderId, setResolvedOrderId] = useState<number | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatCursor, setChatCursor] = useState<number | null>(null);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatLoadingMore, setChatLoadingMore] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const wsBufferRef = useRef("");

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const loadOrder = useCallback(async (orderId: number) => {
    setLoadingOrder(true);
    setOrderError(null);
    try {
      const data = await getOrder(orderId);
      setOrder(data);
      const orderCurrency = (data.currency ?? "").toUpperCase();
      if (orderCurrency === "USD" || orderCurrency === "EUR" || orderCurrency === "RUB") {
        setCurrency(orderCurrency);
      }
    } catch (e) {
      setOrderError(asErrorMessage(e));
      setOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  }, []);

  const loadInitialChat = useCallback(async (orderId: number) => {
    setChatLoading(true);
    setChatError(null);
    try {
      const response = await getOrderChatMessages(orderId, { size: 50 });
      const normalized = [...(response.messages ?? [])].reverse();
      setMessages((prev) => mergeMessages(prev, normalized));
      setChatCursor(response.nextCursorMessageId);
      setChatHasMore(response.nextCursorMessageId !== null);
    } catch (e) {
      setChatError(asErrorMessage(e));
    } finally {
      setChatLoading(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!resolvedOrderId || chatCursor == null || chatLoadingMore) return;
    setChatLoadingMore(true);
    setChatError(null);
    try {
      const response = await getOrderChatMessages(resolvedOrderId, {
        size: 50,
        beforeMessageId: chatCursor,
      });
      const normalized = [...(response.messages ?? [])].reverse();
      setMessages((prev) => mergeMessages(prev, normalized));
      setChatCursor(response.nextCursorMessageId);
      setChatHasMore(response.nextCursorMessageId !== null);
    } catch (e) {
      setChatError(asErrorMessage(e));
    } finally {
      setChatLoadingMore(false);
    }
  }, [chatCursor, chatLoadingMore, resolvedOrderId]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [authOpen, isAuthed]);

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      try {
        const p = await params;
        const parsed = Number(p.orderId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          if (mounted) {
            setResolvedOrderId(null);
            setOrderError("Order not found");
            setLoadingOrder(false);
          }
          return;
        }

        if (!mounted) return;
        setResolvedOrderId(parsed);
        await loadOrder(parsed);
      } catch (e) {
        if (!mounted) return;
        setOrderError(asErrorMessage(e));
        setLoadingOrder(false);
      }
    };

    void resolve();
    return () => {
      mounted = false;
    };
  }, [loadOrder, params]);

  useEffect(() => {
    if (!resolvedOrderId || order?.status !== "PAID") {
      setMessages([]);
      setChatCursor(null);
      setChatHasMore(false);
      setChatError(null);
      return;
    }

    void loadInitialChat(resolvedOrderId);
  }, [loadInitialChat, order?.status, resolvedOrderId]);

  useEffect(() => {
    if (!resolvedOrderId || order?.status !== "PAID") {
      setWsConnected(false);
      setWsError(null);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const token = readAuth()?.accessToken;
    if (!token) {
      setWsConnected(false);
      setWsError("Sign in required for realtime chat");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    if (!apiBase) {
      setWsConnected(false);
      setWsError("NEXT_PUBLIC_API_BASE is not set");
      return;
    }

    const ws = new WebSocket(toWsUrl(apiBase), ["v12.stomp", "v11.stomp"]);
    wsRef.current = ws;
    wsBufferRef.current = "";
    setWsConnected(false);
    setWsError(null);

    ws.onopen = () => {
      ws.send(
        serializeStompFrame("CONNECT", {
          Authorization: `Bearer ${token}`,
          "accept-version": "1.2",
          "heart-beat": "10000,10000",
        }),
      );
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      wsBufferRef.current += event.data;

      let idx = wsBufferRef.current.indexOf("\u0000");
      while (idx >= 0) {
        const frameRaw = wsBufferRef.current.slice(0, idx);
        wsBufferRef.current = wsBufferRef.current.slice(idx + 1);

        const cleaned = frameRaw.trim();
        if (cleaned.length > 0) {
          const frame = parseStompFrame(cleaned);
          if (frame) {
            if (frame.command === "CONNECTED") {
              setWsConnected(true);
              ws.send(
                serializeStompFrame("SUBSCRIBE", {
                  id: `order-chat-${resolvedOrderId}`,
                  destination: `/topic/order-chat/${resolvedOrderId}`,
                  ack: "auto",
                }),
              );
            } else if (frame.command === "MESSAGE") {
              try {
                const message = JSON.parse(frame.body) as ChatMessage;
                if (message && typeof message.id === "number") {
                  setMessages((prev) => mergeMessages(prev, [message]));
                }
              } catch {
                // Ignore malformed frames to keep realtime stream alive.
              }
            } else if (frame.command === "ERROR") {
              const errMessage = frame.body || frame.headers.message || "WebSocket error";
              setWsError(errMessage);
            }
          }
        }

        idx = wsBufferRef.current.indexOf("\u0000");
      }
    };

    ws.onerror = () => {
      setWsConnected(false);
      setWsError("WebSocket connection error");
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(serializeStompFrame("DISCONNECT", { receipt: "bye" }));
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [order?.status, resolvedOrderId]);

  const onPay = useCallback(async () => {
    if (!resolvedOrderId || paying) return;
    try {
      setPaying(true);
      setOrderError(null);
      await payOrder(resolvedOrderId);
      await loadOrder(resolvedOrderId);
    } catch (e) {
      setOrderError(asErrorMessage(e));
    } finally {
      setPaying(false);
    }
  }, [loadOrder, paying, resolvedOrderId]);

  const onSendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const body = chatInput.trim();
      if (!body || !resolvedOrderId) return;

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !wsConnected) {
        setWsError("Realtime chat is not connected");
        return;
      }

      try {
        setSendingMessage(true);
        ws.send(
          serializeStompFrame(
            "SEND",
            {
              destination: `/app/ws/order-chat/${resolvedOrderId}/send`,
              "content-type": "application/json",
            },
            JSON.stringify({ body }),
          ),
        );
        setChatInput("");
        // Some backends do not echo sender messages over SUBSCRIBE.
        // Pulling the latest page right after SEND keeps UI consistent.
        await new Promise((resolve) => setTimeout(resolve, 250));
        const latest = await getOrderChatMessages(resolvedOrderId, { size: 50 });
        const normalized = [...(latest.messages ?? [])].reverse();
        setMessages((prev) => mergeMessages(prev, normalized));
        setChatCursor(latest.nextCursorMessageId);
        setChatHasMore(latest.nextCursorMessageId !== null);
      } finally {
        setSendingMessage(false);
      }
    },
    [chatInput, resolvedOrderId, wsConnected],
  );

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <section className="relative mx-auto mt-8 max-w-7xl space-y-6 overflow-hidden px-4">
        <div className="pointer-events-none absolute left-0 top-[180px] h-72 w-72 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-4 top-[280px] h-80 w-80 rounded-full bg-violet-500/10 blur-[140px]" />

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-200 transition-colors">
            Marketplace
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Order</span>
          {resolvedOrderId ? <span className="text-zinc-400">#{resolvedOrderId}</span> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
          <section className="card overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
            <div className="text-sm uppercase tracking-[0.18em] text-zinc-300/80">Order</div>
            {loadingOrder ? (
              <div className="mt-4 flex items-center gap-2 text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading order...
              </div>
            ) : orderError ? (
              <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-200">
                {orderError}
              </div>
            ) : order ? (
              <div className="mt-4 space-y-3 text-sm text-zinc-200">
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Order ID</span>
                  <span>#{order.orderId}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Product</span>
                  <span>#{order.productId}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Status</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      order.status === "PAID"
                        ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                        : "border border-amber-300/25 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Amount</span>
                  <span>{formatPrice(order.amount ?? null, order.currency)}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Currency</span>
                  <span>{order.currency}</span>
                </div>

                {order.status !== "PAID" ? (
                  <button className="btn btn-primary mt-2 w-full" onClick={onPay} disabled={paying}>
                    {paying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing payment...
                      </>
                    ) : (
                      "Pay (mock)"
                    )}
                  </button>
                ) : (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    Payment completed. Chat is available.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-sm text-zinc-300">Order not found</div>
            )}
          </section>

          <section className="card overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/35 to-transparent" />
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm uppercase tracking-[0.18em] text-zinc-300/80">Chat</div>
              {order?.status === "PAID" ? (
                <div className={wsConnected ? "text-xs text-emerald-300" : "text-xs text-zinc-400"}>
                  {wsConnected ? "Realtime connected" : "Realtime disconnected"}
                </div>
              ) : null}
            </div>

            {order?.status !== "PAID" ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                Chat will appear after payment.
              </div>
            ) : (
              <>
                {wsError ? (
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-200">
                    {wsError}
                  </div>
                ) : null}

                {chatError ? (
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-200">
                    {chatError}
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-black/30 to-black/15 p-3">
                  {chatHasMore ? (
                    <div className="mb-3 flex justify-center">
                      <button className="btn" onClick={loadOlderMessages} disabled={chatLoadingMore}>
                        {chatLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load older"
                        )}
                      </button>
                    </div>
                  ) : null}

                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {chatLoading ? (
                      <div className="py-10 text-center text-sm text-zinc-400">Loading chat...</div>
                    ) : messages.length === 0 ? (
                      <div className="py-10 text-center text-sm text-zinc-400">No messages yet</div>
                    ) : (
                      messages.map((message) => {
                        const mine = message.participant === "BUYER";
                        return (
                          <div
                            key={message.id}
                            className={`rounded-xl border px-3 py-2 text-sm ${
                              mine
                                ? "ml-8 border-pink-400/25 bg-gradient-to-br from-pink-500/18 to-violet-500/12 text-zinc-100"
                                : "mr-8 border-white/10 bg-white/5 text-zinc-200"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                              <span>{message.participant}</span>
                              <span>{new Date(message.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="whitespace-pre-wrap break-words">{message.body}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <form className="mt-3 flex gap-2" onSubmit={onSendMessage}>
                  <input
                    className="input"
                    placeholder={wsConnected ? "Type a message..." : "Type a message (sending is available when realtime reconnects)"}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={4000}
                    disabled={sendingMessage}
                  />
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={!wsConnected || sendingMessage || chatInput.trim().length === 0}
                  >
                    {sendingMessage ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthChanged={refreshAuth} />
    </main>
  );
}
