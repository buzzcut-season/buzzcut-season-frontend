"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import { PairChat } from "@/components/PairChat";
import { asErrorMessage, getChats } from "@/lib/api";
import { readAuth } from "@/lib/storage";
import type { ChatListItem } from "@/lib/types";

const PAGE_SIZE = 20;

function formatChatTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  return new Date(timestamp).toLocaleString();
}

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("USD");
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUserId = useMemo(() => {
    const raw = searchParams.get("userId");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const selectedNickname = searchParams.get("nickname")?.trim() || null;

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const loadChatsPage = useCallback(async (nextPage: number, mode: "reset" | "append") => {
    if (mode === "reset") {
      setLoadingInitial(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await getChats({ page: nextPage, size: PAGE_SIZE });
      const chunk = response.messages ?? [];
      setItems((prev) => (mode === "reset" ? chunk : [...prev, ...chunk]));
      setPage(nextPage);
      setHasMore(chunk.length >= PAGE_SIZE);
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      if (mode === "reset") {
        setItems([]);
        setPage(0);
        setHasMore(false);
      }
    } finally {
      if (mode === "reset") {
        setLoadingInitial(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [authOpen, isAuthed]);

  useEffect(() => {
    if (!isAuthed) {
      setItems([]);
      setPage(0);
      setHasMore(true);
      setError(null);
      setLoadingInitial(false);
      setLoadingMore(false);
      return;
    }
    void loadChatsPage(0, "reset");
  }, [isAuthed, loadChatsPage]);

  const selectedChat = useMemo(() => {
    if (selectedUserId == null) return null;
    return items.find((item) => item.userId === selectedUserId) ?? null;
  }, [items, selectedUserId]);

  const activeUserId = selectedUserId ?? selectedChat?.userId ?? null;
  const activeUserLabel = selectedNickname ?? selectedChat?.nickname ?? "user";

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <section className="mx-auto mt-8 max-w-6xl space-y-4 px-4">
        <div className="text-xs text-zinc-400">
          <Link href="/" className="transition hover:text-zinc-200">
            Marketplace
          </Link>{" "}
          / Chats
        </div>

        {!isAuthed ? (
          <div className="card p-6 space-y-3">
            <div className="text-lg font-semibold">My Chats</div>
            <div className="text-sm text-zinc-300">Sign in to view and continue your conversations.</div>
            <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
            <section className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300/80">
                  <MessageSquare className="h-4 w-4 text-pink-300" />
                  My Chats
                </div>
                <button
                  className="btn"
                  type="button"
                  onClick={() => void loadChatsPage(0, "reset")}
                  disabled={loadingInitial || loadingMore}
                >
                  {loadingInitial ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Refresh
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {loadingInitial ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading chats...
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>
                ) : items.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
                    No chats yet. A chat appears here after the first message is sent.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const active = item.userId === activeUserId;
                        return (
                          <button
                            key={item.chatKey}
                            type="button"
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-pink-400/35 bg-pink-500/10"
                                : "border-white/10 bg-black/20 hover:border-white/20"
                            }`}
                            onClick={() =>
                              router.push(
                                `/chats?userId=${encodeURIComponent(String(item.userId))}&nickname=${encodeURIComponent(item.nickname)}`,
                              )
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-zinc-100">{item.nickname}</div>
                                <div className="mt-1 truncate text-xs text-zinc-400">{item.body}</div>
                              </div>
                              <div className="shrink-0 text-[11px] text-zinc-500">{formatChatTimestamp(item.createdAt)}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {hasMore ? (
                      <button
                        className="btn w-full"
                        type="button"
                        onClick={() => void loadChatsPage(page + 1, "append")}
                        disabled={loadingMore}
                      >
                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {loadingMore ? "Loading..." : "Load more"}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            {activeUserId != null ? (
              <PairChat
                isAuthed={isAuthed}
                otherUserId={activeUserId}
                otherUserLabel={activeUserLabel}
                title="Direct Chat"
                emptyTitle="No messages yet"
                emptyDescription="The same history is shared between the product page, the order page, and this chat list."
              />
            ) : (
              <section className="card p-6">
                <div className="text-lg font-semibold text-zinc-100">Choose a chat</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Select a conversation from the list to open the shared buyer-seller chat.
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthChanged={refreshAuth} />
    </main>
  );
}
