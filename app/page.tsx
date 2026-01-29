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
  const serviceItems = [
    { title: "Escrow & protection", meta: "Guaranteed delivery" },
    { title: "Curated drops", meta: "Limited editions" },
    { title: "Guild support", meta: "24/7 assistance" },
  ];
  const accountItems = [
    { title: "Profile", meta: "Identity & preferences" },
    { title: "Orders", meta: "Track shipments" },
    { title: "Favorites", meta: "Saved items" },
  ];

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
          {/* Glass container with layered glow to create depth without clutter. */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#191227]/90 via-[#120c1c]/95 to-[#0b0a10]/95 p-6 shadow-[0_30px_80px_rgba(7,4,18,0.65)]">
            <div className="pointer-events-none absolute -top-32 right-[-40px] h-64 w-64 rounded-full bg-violet-500/15 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 left-[-60px] h-72 w-72 rounded-full bg-pink-500/15 blur-[90px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

            <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr]">
              {/* Primary column keeps catalog dominant for hierarchy. */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition duration-200 hover:border-violet-300/30 hover:shadow-[0_20px_48px_rgba(124,58,237,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-violet-200/80">Catalog</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-100">Browse categories</div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    Curated
                  </span>
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
              </section>

              {/* Service column uses compact cards to replace flat lists. */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition duration-200 hover:border-violet-300/20">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-indigo-200/80">Service</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">Trusted delivery</div>
                </div>
                <div className="mt-4 space-y-3">
                  {serviceItems.map((item, index) => (
                    <button
                      key={item.title}
                      className="group relative w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-zinc-100 transition duration-200 hover:border-violet-300/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.2)]"
                      data-active={index === 0}
                      type="button"
                    >
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-zinc-400">{item.meta}</div>
                      <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent opacity-0 transition duration-200 group-hover:opacity-100 data-[active=true]:opacity-100" />
                    </button>
                  ))}
                </div>
              </section>

              {/* Account column mixes CTA + quick actions for better UX. */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition duration-200 hover:border-violet-300/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-pink-200/80">Account</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-100">
                      {isAuthed ? "Signed in" : "Guest access"}
                    </div>
                  </div>
                  {!isAuthed && (
                    <button
                      className="btn btn-primary h-8 px-3 text-xs"
                      onClick={() => setAuthOpen(true)}
                      type="button"
                    >
                      Sign in
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {accountItems.map((item, index) => (
                    <button
                      key={item.title}
                      className="group relative w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-zinc-100 transition duration-200 hover:border-pink-300/30 hover:shadow-[0_0_24px_rgba(236,72,153,0.2)]"
                      data-active={index === 0}
                      type="button"
                    >
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-zinc-400">{item.meta}</div>
                      <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-pink-300/70 to-transparent opacity-0 transition duration-200 group-hover:opacity-100 data-[active=true]:opacity-100" />
                    </button>
                  ))}
                </div>
              </section>
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
