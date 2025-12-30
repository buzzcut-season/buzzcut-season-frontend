"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { ProductCard } from "@/components/ProductCard";
import { asErrorMessage, getProductFeed } from "@/lib/api";
import type { ProductFeedItem } from "@/lib/types";
import { readAuth } from "@/lib/storage";

export default function Page() {
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  function refreshAuth() {
    setIsAuthed(!!readAuth()?.accessToken);
  }

  const [items, setItems] = useState<ProductFeedItem[]>([]);
  const [page, setPage] = useState(0);
  const size = 24;

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoadMore = useMemo(() => items.length > 0, [items.length]);

  useEffect(() => {
    refreshAuth();
  }, []);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [isAuthed, authOpen]);

  async function load(p: number, mode: "replace" | "append") {
    try {
      if (mode === "replace") {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const res = await getProductFeed({ page: p, size });
      const newItems = res.items ?? [];
      setItems((prev) => (mode === "replace" ? newItems : [...prev, ...newItems]));
      setPage(p);
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
      />

      <section className="mx-auto max-w-6xl px-4 mt-6">
        {error && (
          <div className="mt-4 card p-4 border-red-500/25 bg-red-500/5">
            <div className="text-sm font-medium text-red-200">Ошибка</div>
            <div className="text-xs text-zinc-300 mt-1 break-words">{error}</div>
            <div className="text-xs text-zinc-500 mt-2">
              Если ошибка похожа на CORS — это ограничения браузера. Тогда нужно включить CORS на API или сделать прокси через Next.
            </div>
          </div>
        )}

        <div className="mt-6">
          {!isAuthed && (
            <div className="mb-6 card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-200">
                  Войди, чтобы продолжить
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Авторизация по email — займёт меньше минуты
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!isAuthed) {
                    setAuthOpen(true);
                  }
                }}
              >
                Войти
              </button>
            </div>
          )}

          {loading ? (
            <div className="card p-10 grid place-items-center">
              <div className="flex items-center gap-2 text-zinc-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                Загружаю товары...
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it) => (
                  <ProductCard key={it.id} item={it} />
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  className="btn btn-primary"
                  onClick={() => load(page + 1, "append")}
                  disabled={loadingMore || !canLoadMore}
                  title="Загрузить следующую страницу (если API поддерживает page/size)"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Гружу...
                    </>
                  ) : (
                    "Загрузить ещё"
                  )}
                </button>
              </div>

              <div className="mt-3 text-center text-xs text-zinc-500">
                page={page}, size={size}
              </div>
            </>
          )}
        </div>
      </section>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthChanged={refreshAuth}
      />
    </main>
  );
}
