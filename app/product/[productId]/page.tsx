"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Star, Store } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import { ProductReviewsSection } from "@/components/ProductReviewsSection";
import { ApiHttpError, asErrorMessage, createOrder, getProductCard } from "@/lib/api";
import { readAuth } from "@/lib/storage";
import type { ProductCard as ProductCardType } from "@/lib/types";

type PageProps = {
  params: Promise<{ productId: string }>;
};

function formatPrice(price: string, currency: string): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return `${price} ${currency}`;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default function ProductPage({ params }: PageProps) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("RUB");

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductCardType | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [isAuthed, authOpen]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const p = await params;
        const numericId = Number(p.productId);
        if (!Number.isInteger(numericId) || numericId <= 0) {
          if (mounted) {
            setError("Product not found");
            setProduct(null);
            setResolvedId(null);
          }
          return;
        }

        if (mounted) {
          setResolvedId(numericId);
        }

        const data = await getProductCard(numericId);
        if (!mounted) return;

        setProduct(data);
        setActiveImage(data.images?.[0]?.image ?? null);
      } catch (e) {
        if (!mounted) return;
        if (e instanceof ApiHttpError && e.status === 404) {
          setError("Product not found");
        } else {
          setError(asErrorMessage(e));
        }
        setProduct(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [params]);

  const images = useMemo(() => product?.images ?? [], [product]);
  const selectedPrice = useMemo(
    () => product?.prices?.find((price) => price.currency === currency) ?? null,
    [product, currency],
  );

  const handleBuy = useCallback(async () => {
    if (!product) return;
    if (!isAuthed) {
      setAuthOpen(true);
      return;
    }

    try {
      setBuying(true);
      setBuyError(null);
      const order = await createOrder({
        productId: product.id,
        currency,
      });
      router.push(`/orders/${order.orderId}`);
    } catch (e) {
      setBuyError(asErrorMessage(e));
    } finally {
      setBuying(false);
    }
  }, [currency, isAuthed, product, router]);

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
        {loading ? (
          <div className="card p-10 grid place-items-center">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading product...
            </div>
          </div>
        ) : error ? (
          <div className="card p-6 border-red-500/25 bg-red-500/5">
            <div className="text-sm font-medium text-red-700">Error</div>
            <div className="text-sm text-red-700/80 mt-2">{error}</div>
          </div>
        ) : product ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/" className="hover:text-zinc-200 transition-colors">
                Marketplace
              </Link>
              <span>/</span>
              <span className="text-zinc-200 truncate">{product.name}</span>
            </div>

            <div className="card overflow-hidden p-5 md:p-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/20 to-transparent" />
              <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    {activeImage ? (
                      <>
                        <div
                          className="absolute inset-0 scale-110 blur-2xl opacity-45"
                          style={{
                            backgroundImage: `url(${activeImage})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                          }}
                          aria-hidden
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70"
                          aria-hidden
                        />
                        <Image
                          src={activeImage}
                          alt={product.name}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-contain p-4"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-sm text-[var(--muted)]">
                        No image available
                      </div>
                    )}
                  </div>

                  {images.length > 0 ? (
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {images.map((img) => {
                        const isActive = img.image === activeImage;
                        return (
                          <button
                            key={`${img.position}-${img.image}`}
                            type="button"
                            onClick={() => setActiveImage(img.image)}
                            className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                              isActive
                                ? "border-pink-400/80 ring-2 ring-pink-300/35"
                                : "border-white/10 hover:border-white/25"
                            }`}
                            aria-label={`Image ${img.position + 1}`}
                          >
                            <Image
                              src={img.image}
                              alt={`${product.name} ${img.position + 1}`}
                              fill
                              unoptimized
                              sizes="120px"
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <h1 className="text-2xl font-semibold leading-tight md:text-3xl">{product.name}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-200/90 whitespace-pre-wrap">
                      {product.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <Store className="h-3.5 w-3.5 text-pink-300" />
                        <span>{product.seller}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <Star className="h-3.5 w-3.5 text-amber-300" />
                        <span>
                          {product.reviews.averageRating == null
                            ? "Пока нет отзывов"
                            : `${product.reviews.averageRating} · ${product.reviews.totalCount} review${
                                product.reviews.totalCount === 1 ? "" : "s"
                              }`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-pink-400/25 bg-gradient-to-br from-pink-500/15 via-violet-500/10 to-black/40 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300/80">Price · {currency}</div>
                    {selectedPrice ? (
                      <div className="mt-2 text-3xl font-semibold text-zinc-50">
                        {formatPrice(selectedPrice.price, selectedPrice.currency)}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-zinc-300">Price to be confirmed</div>
                    )}
                    <div className="mt-3 text-xs text-zinc-400">
                      Final currency is controlled in the page header.
                    </div>
                    <button className="btn btn-primary mt-4 w-full" onClick={handleBuy} disabled={buying}>
                      {buying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating order...
                        </>
                      ) : (
                        "Buy"
                      )}
                    </button>
                    {buyError ? (
                      <div className="mt-2 text-xs text-red-200">
                        {buyError}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium text-zinc-200">Digital product details</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Access terms, format, and usage information will appear in upcoming iterations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="card p-5">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-pink-300" />
                  <h2 className="text-sm font-semibold">Rating</h2>
                </div>
                {product.reviews.averageRating == null ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">Пока нет отзывов</p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {product.reviews.averageRating} average rating based on {product.reviews.totalCount} review
                    {product.reviews.totalCount === 1 ? "" : "s"}.
                  </p>
                )}
              </section>
              <section className="card p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-pink-300" />
                  <h2 className="text-sm font-semibold">Purchase protection</h2>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  After payment you can chat in the order page, complete the order, and leave a review.
                </p>
              </section>
            </div>

            <ProductReviewsSection productId={product.id} summary={product.reviews} />
          </div>
        ) : (
          <div className="card p-6">
            <div className="text-sm text-zinc-300">Product not found</div>
            {resolvedId ? <div className="mt-2 text-xs text-zinc-500">ID: {resolvedId}</div> : null}
          </div>
        )}
      </section>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthChanged={refreshAuth}
      />
    </main>
  );
}
