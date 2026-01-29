"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { ProductCard } from "@/components/ProductCard";
import { CategoryTree } from "@/components/CategoryTree";
import { asErrorMessage, getCategoryTree, getProductFeed } from "@/lib/api";
import type { CategoryNode, ProductFeedItem } from "@/lib/types";
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

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        const res = await getCategoryTree();
        setCategories(res.categories ?? []);
      } catch (e) {
        setCategoriesError(asErrorMessage(e));
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

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
            <div className="text-sm font-medium text-red-700">Error</div>
            <div className="text-xs text-red-700/80 mt-1 break-words">{error}</div>
          </div>
        )}

        <div className="mt-6">
          <div className="relative overflow-hidden rounded-[28px] border border-transparent bg-gradient-to-br from-[#161225]/95 via-[#0f0b18]/95 to-[#0b0a10]/98 px-6 py-5 shadow-[0_18px_50px_rgba(6,4,16,0.5),inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="pointer-events-none absolute -top-28 right-[-30px] h-56 w-56 rounded-full bg-violet-500/12 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 left-[-50px] h-64 w-64 rounded-full bg-pink-500/10 blur-[90px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/15 to-transparent" />

            <div className="space-y-1">
              <div className="text-sm font-semibold tracking-tight text-zinc-100">Catalog</div>
              <div className="text-xs text-zinc-400/90">Browse categories</div>
            </div>
            <div className="mt-4">
              {categoriesLoading ? (
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : categoriesError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                  {categoriesError}
                </div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No categories yet</div>
              ) : (
                <CategoryTree categories={categories} />
              )}
            </div>
          </div>

          {loading ? (
            <div className="card p-10 grid place-items-center">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading products...
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
                  title="Load the next page (if the API supports page/size)"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
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
