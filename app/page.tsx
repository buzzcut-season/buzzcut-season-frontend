"use client";

import { Suspense, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { ProductCard } from "@/components/ProductCard";
import { CategoryTree } from "@/components/CategoryTree";
import { asErrorMessage, getCategoryTree, getProductFeed } from "@/lib/api";
import type { CategoryNode, ProductFeedItem } from "@/lib/types";
import { readAuth } from "@/lib/storage";

function findCategoryNameBySlug(nodes: CategoryNode[], slug: string): string | null {
  for (const node of nodes) {
    if (node.slug === slug) return node.name;
    const nested = findCategoryNameBySlug(node.children, slug);
    if (nested) return nested;
  }
  return null;
}

function parsePage(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

const SEARCH_DEBOUNCE_MS = 350;

function HomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("RUB");
  const [searchInput, setSearchInput] = useState("");

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const [items, setItems] = useState<ProductFeedItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const size = 20;
  const previousFeedStateRef = useRef<{
    category: string | null;
    query: string;
    page: number;
  } | null>(null);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategorySlug = searchParams.get("category");
  const searchQuery = searchParams.get("query")?.trim() ?? "";
  const page = parsePage(searchParams.get("page"));
  const canLoadMore = hasMore;
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategorySlug) return null;
    return findCategoryNameBySlug(categories, selectedCategorySlug);
  }, [categories, selectedCategorySlug]);

  useEffect(() => {
    refreshAuth();
  }, []);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [isAuthed, authOpen]);

  useEffect(() => {
    const previousFeedState = previousFeedStateRef.current;
    const canAppend =
      previousFeedState != null &&
      previousFeedState.category === selectedCategorySlug &&
      previousFeedState.query === searchQuery &&
      page === previousFeedState.page + 1;

    const loadFeed = async () => {
      try {
        setError(null);
        if (canAppend) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        if (canAppend) {
          const res = await getProductFeed({
            page,
            size,
            category: selectedCategorySlug,
            query: searchQuery,
          });
          const newItems = res.items ?? [];
          setItems((prev) => [...prev, ...newItems]);
          setHasMore(newItems.length >= size);
        } else {
          const responses = await Promise.all(
            Array.from({ length: page + 1 }, (_, index) =>
              getProductFeed({
                page: index,
                size,
                category: selectedCategorySlug,
                query: searchQuery,
              }),
            ),
          );
          const nextItems = responses.flatMap((response) => response.items ?? []);
          const lastResponse = responses.at(-1);
          setItems(nextItems);
          setHasMore((lastResponse?.items?.length ?? 0) >= size);
        }

        previousFeedStateRef.current = {
          category: selectedCategorySlug,
          query: searchQuery,
          page,
        };
      } catch (e) {
        setError(asErrorMessage(e));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    void loadFeed();
  }, [page, searchQuery, selectedCategorySlug, size]);

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

  const updateCatalogParams = useCallback((updates: {
    category?: string | null;
    query?: string | null;
    page?: number | null;
  }) => {
    const qs = new URLSearchParams(searchParams.toString());

    if (updates.category !== undefined) {
      if (updates.category) {
        qs.set("category", updates.category);
      } else {
        qs.delete("category");
      }
    }

    if (updates.query !== undefined) {
      const nextQuery = updates.query?.trim() ?? "";
      if (nextQuery) {
        qs.set("query", nextQuery);
      } else {
        qs.delete("query");
      }
    }

    if (updates.page !== undefined) {
      const nextPage = updates.page ?? 0;
      if (nextPage > 0) {
        qs.set("page", String(nextPage));
      } else {
        qs.delete("page");
      }
    }

    if (!qs.get("category")) {
      qs.delete("category");
    }

    const query = qs.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (searchInput === searchQuery) return;

    const timeoutId = window.setTimeout(() => {
      updateCatalogParams({ query: searchInput, page: 0 });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput, searchQuery, updateCatalogParams]);

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
              <div className="text-xs text-zinc-400/90">
                {selectedCategoryName ? `Category: ${selectedCategoryName}` : "Browse categories"}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  className="input !pl-12 !pr-10"
                  type="search"
                  placeholder="Search products"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                  }}
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
                    onClick={() => {
                      setSearchInput("");
                      updateCatalogParams({ query: "", page: 0 });
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </label>
              {selectedCategorySlug ? (
                <button
                  className="btn w-fit"
                  type="button"
                  onClick={() => {
                    updateCatalogParams({ category: null, page: 0 });
                  }}
                >
                  All products
                </button>
              ) : null}
            </div>
            <div
              className={`mt-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-zinc-300 transition-opacity ${
                selectedCategorySlug || searchQuery ? "opacity-100" : "opacity-0"
              }`}
            >
              {selectedCategorySlug ? (
                <span className="badge">
                  Category: {selectedCategoryName ?? selectedCategorySlug}
                </span>
              ) : null}
              {searchQuery ? (
                <span className="badge">Search: {searchQuery}</span>
              ) : null}
              {!selectedCategorySlug && !searchQuery ? (
                <span className="badge pointer-events-none select-none">Filters</span>
              ) : null}
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
                <CategoryTree
                  categories={categories}
                  selectedSlug={selectedCategorySlug}
                  onSelectCategory={(node) => {
                    updateCatalogParams({
                      category: selectedCategorySlug === node.slug ? null : node.slug,
                      page: 0,
                    });
                  }}
                />
              )}
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="card p-10 grid place-items-center">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading products...
              </div>
            </div>
          ) : (
            <>
              {items.length === 0 ? (
                <div className="card mt-6 p-10 text-center">
                  <div className="text-base font-semibold text-zinc-100">No products found</div>
                  <div className="mt-2 text-sm text-zinc-400">
                    Try another category or change the search query.
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((it) => (
                    <ProductCard key={it.id} item={it} currency={currency} />
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button
                  className="btn btn-primary"
                  onClick={() => updateCatalogParams({ page: page + 1 })}
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

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen pb-16" />}>
      <HomePageContent />
    </Suspense>
  );
}
