"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { ProductCard } from "@/components/ProductCard";
import { asErrorMessage, getProductFeed } from "@/lib/api";
import type { ProductFeedItem } from "@/lib/types";
import { readAuth } from "@/lib/storage";

export default function Page() {
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("RUB");

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const [items, setItems] = useState<ProductFeedItem[]>([]);
  const [page, setPage] = useState(0);
  const size = 24;

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoadMore = items.length > 0;

  useEffect(() => {
    refreshAuth();
  }, []);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [isAuthed, authOpen]);

  const load = useCallback(async (p: number, mode: "replace" | "append") => {
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
  }, [size]);

  useEffect(() => {
    load(0, "replace");
  }, [load]);

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <section className="mx-auto max-w-7xl px-4 mt-8">
        {error && (
          <div className="mt-4 card p-4 border-red-500/25 bg-red-500/5">
            <div className="text-sm font-medium text-red-700">Ошибка</div>
            <div className="text-xs text-red-700/80 mt-1 break-words">{error}</div>
          </div>
        )}

        <div className="mt-6">
          <div className="card p-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Каталог</div>
              <div className="text-xs text-[var(--muted)] mt-1">
                Скоро здесь появятся тематические подборки
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Игры и игровые сервисы",
                "Игровые ценности",
                "Мобильные игры",
                "Сервисы и соцсети",
                "Программы",
              ].map((label) => (
                <span key={label} className="badge">
                  {label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="card p-10 grid place-items-center">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Загружаю товары...
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((it) => (
                  <ProductCard key={it.id} item={it} currency={currency} />
                ))}
              </div>

              <div className="mt-8 flex justify-center">
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
