"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Star } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import { PairChat } from "@/components/PairChat";
import { RatingStars } from "@/components/RatingStars";
import {
  asErrorMessage,
  completeSellerOrder,
  createOrderReview,
  getOrder,
  getSellerOrder,
  payOrder,
  refundSellerOrder,
} from "@/lib/api";
import { hasSellerAccess, readAuth } from "@/lib/storage";
import type { OrderPageResponse } from "@/lib/types";

type Role = "buyer" | "seller";

type OrderDetailsPageClientProps = {
  params: Promise<{ orderId: string }>;
  role: Role;
};

type CurrencyCode = "RUB" | "USD" | "EUR";

function formatPrice(price: string | null | undefined, currency: string): string {
  const amount = Number(price);
  if (!price || !Number.isFinite(amount)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${price} ${currency}`;
  }
}

function getOrderTitle(order: OrderPageResponse): string {
  const title = order.displaySettings.productName?.trim();
  if (title) return title;
  return `#${order.orderId}`;
}

function formatReviewTimestamp(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toLocaleString();
}

export function OrderDetailsPageClient({ params, role }: OrderDetailsPageClientProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const [resolvedOrderId, setResolvedOrderId] = useState<number | null>(null);
  const [order, setOrder] = useState<OrderPageResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
    setIsSeller(hasSellerAccess());
  }, []);

  const loadOrder = useCallback(async (orderId: number) => {
    setLoadingOrder(true);
    setOrderError(null);
    try {
      const data = role === "buyer" ? await getOrder(orderId) : await getSellerOrder(orderId);
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
  }, [role]);

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
    setReviewError(null);
    setReviewText("");
    setReviewRating(5);
  }, [resolvedOrderId]);

  const sellerAccessDenied = role === "seller" && isAuthed && !isSeller;

  const onPay = useCallback(async () => {
    if (role !== "buyer" || !resolvedOrderId || paying) return;
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
  }, [loadOrder, paying, resolvedOrderId, role]);

  const onComplete = useCallback(async () => {
    if (role !== "seller" || !resolvedOrderId || completing) return;
    try {
      setCompleting(true);
      setOrderError(null);
      const data = await completeSellerOrder(resolvedOrderId);
      setOrder((prev) => ({ ...data, review: prev?.review ?? null }));
      const orderCurrency = (data.currency ?? "").toUpperCase();
      if (orderCurrency === "USD" || orderCurrency === "EUR" || orderCurrency === "RUB") {
        setCurrency(orderCurrency);
      }
    } catch (e) {
      setOrderError(asErrorMessage(e));
    } finally {
      setCompleting(false);
    }
  }, [completing, resolvedOrderId, role]);

  const onRefund = useCallback(async () => {
    if (role !== "seller" || !resolvedOrderId || refunding) return;
    try {
      setRefunding(true);
      setOrderError(null);
      const data = await refundSellerOrder(resolvedOrderId);
      setOrder((prev) => ({ ...data, review: prev?.review ?? null }));
      const orderCurrency = (data.currency ?? "").toUpperCase();
      if (orderCurrency === "USD" || orderCurrency === "EUR" || orderCurrency === "RUB") {
        setCurrency(orderCurrency);
      }
    } catch {
      setOrderError("Не удалось выполнить действие");
    } finally {
      setRefunding(false);
    }
  }, [refunding, resolvedOrderId, role]);

  const onSubmitReview = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (role !== "buyer" || !resolvedOrderId || order?.status !== "COMPLETED" || reviewSubmitting) return;

      const normalizedText = reviewText.trim();
      if (!Number.isInteger(reviewRating) || reviewRating < 1 || reviewRating > 5) {
        setReviewError("Rating must be between 1 and 5");
        return;
      }
      if (normalizedText.length > 4000) {
        setReviewError("Review text must be 4000 characters or less");
        return;
      }

      try {
        setReviewSubmitting(true);
        setReviewError(null);
        const review = await createOrderReview(resolvedOrderId, {
          rating: reviewRating,
          ...(normalizedText ? { text: normalizedText } : {}),
        });
        setOrder((prev) => (prev ? { ...prev, review } : prev));
        setReviewText("");
      } catch {
        setReviewError("Не удалось выполнить действие");
      } finally {
        setReviewSubmitting(false);
      }
    },
    [order?.status, resolvedOrderId, reviewRating, reviewSubmitting, reviewText, role],
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

      <section className="relative mx-auto mt-8 max-w-5xl space-y-6 overflow-hidden px-4">
        {sellerAccessDenied ? (
          <div className="card p-6 space-y-3">
            <div className="text-lg font-semibold">Seller access required</div>
            <div className="text-sm text-zinc-300">This page is available only for seller accounts.</div>
            <Link href="/" className="btn">
              Back to marketplace
            </Link>
          </div>
        ) : (
          <>
        <div className="pointer-events-none absolute left-0 top-[180px] h-72 w-72 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-4 top-[280px] h-80 w-80 rounded-full bg-violet-500/10 blur-[140px]" />

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {role === "buyer" ? (
            <Link href="/" className="hover:text-zinc-200 transition-colors">
              Marketplace
            </Link>
          ) : (
            <Link href="/seller" className="hover:text-zinc-200 transition-colors">
              Seller
            </Link>
          )}
          <span>/</span>
          <span className="text-zinc-200">Order</span>
          {order ? (
            <span className="text-zinc-400">{getOrderTitle(order)}</span>
          ) : resolvedOrderId ? (
            <span className="text-zinc-400">#{resolvedOrderId}</span>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,0.95fr]">
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
                {order.displaySettings.coverImage ? (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <Image
                      src={order.displaySettings.coverImage}
                      alt={getOrderTitle(order)}
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain p-2"
                    />
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Order ID</span>
                  <span>#{order.orderId}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Title</span>
                  <span>{getOrderTitle(order)}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Product ID</span>
                  <span>#{order.productId}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Status</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      order.status === "PAID"
                        ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                        : order.status === "COMPLETED"
                          ? "border border-sky-400/30 bg-sky-500/15 text-sky-200"
                        : order.status === "REFUNDED"
                          ? "border border-rose-400/30 bg-rose-500/15 text-rose-200"
                        : "border border-amber-300/25 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Amount</span>
                  <span>{formatPrice(order.price, order.currency)}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-zinc-400">Currency</span>
                  <span>{order.currency}</span>
                </div>

                {role === "buyer" && order.status === "CREATED" ? (
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
                ) : order.status === "PAID" ? (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    Payment completed.
                  </div>
                ) : order.status === "COMPLETED" ? (
                  <div className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-3 text-xs text-sky-200">
                    Order completed.
                  </div>
                ) : order.status === "REFUNDED" ? (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-200">
                    Order refunded.
                  </div>
                ) : null}
                {role === "seller" && order.status === "PAID" ? (
                  <button className="btn btn-primary mt-2 w-full" onClick={onComplete} disabled={completing}>
                    {completing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Completing order...
                      </>
                    ) : (
                      "Complete order"
                    )}
                  </button>
                ) : null}
                {role === "seller" && (order.status === "PAID" || order.status === "COMPLETED") ? (
                  <button className="btn mt-2 w-full" onClick={onRefund} disabled={refunding}>
                    {refunding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Refunding order...
                      </>
                    ) : (
                      "Refund order"
                    )}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 text-sm text-zinc-300">Order not found</div>
            )}
          </section>

          <div className="space-y-6">
            <section className="card overflow-hidden p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/35 to-transparent" />
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-zinc-300/80">
                <Star className="h-4 w-4 text-pink-300" />
                Buyer-Seller Chat
              </div>
              {order ? (
                <div className="mt-4">
                  {order.chatKey ? (
                    <PairChat
                      isAuthed={isAuthed}
                      otherUserId={role === "buyer" ? order.sellerId : order.buyerId}
                      chatKeyOverride={order.chatKey}
                      otherUserLabel={role === "buyer" ? "seller" : "buyer"}
                      title="Direct Chat"
                      emptyTitle="No messages yet"
                      emptyDescription="This is the same chat used on the product page for this buyer-seller pair."
                      className="border-0 bg-transparent p-0 ring-0 shadow-none"
                    />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                      Chat is unavailable until chatKey is present in the order response.
                    </div>
                  )}
                  <Link className="btn mt-4 w-full" href={`/product/${order.productId}`}>
                    Open product
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  Order details are required to open chat.
                </div>
              )}
            </section>

            {order?.review ? (
              <section className="card overflow-hidden p-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-zinc-300/80">
                  <Star className="h-4 w-4 text-amber-300" />
                  Review
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{order.review.buyer}</div>
                      <div className="mt-2">
                        <RatingStars rating={order.review.rating} />
                      </div>
                    </div>
                    <div className="text-right text-xs text-emerald-100/70">
                      <div>{formatReviewTimestamp(order.review.createdAt) ?? "Review date unavailable"}</div>
                      {order.review.updatedAt && order.review.updatedAt !== order.review.createdAt ? (
                        <div className="mt-1">Updated {formatReviewTimestamp(order.review.updatedAt) ?? order.review.updatedAt}</div>
                      ) : null}
                    </div>
                  </div>
                  {order.review.text ? (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-emerald-50/90">
                      {order.review.text}
                    </p>
                  ) : null}
                  <Link
                    className="mt-4 inline-flex text-xs text-emerald-200 underline underline-offset-4"
                    href={`/product/${order.productId}`}
                  >
                    Open product reviews
                  </Link>
                </div>
              </section>
            ) : null}

            {role === "buyer" && order?.status === "COMPLETED" && !order.review ? (
              <section className="card overflow-hidden p-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/35 to-transparent" />
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-zinc-300/80">
                  <Star className="h-4 w-4 text-amber-300" />
                  Leave a review
                </div>

                <form className="mt-4 space-y-4" onSubmit={onSubmitReview}>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Your rating</div>
                    <div className="mt-2">
                      <RatingStars rating={reviewRating} size="lg" interactive onChange={setReviewRating} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-200" htmlFor="review-text">
                      Comment
                    </label>
                    <textarea
                      id="review-text"
                      className="input mt-2 min-h-32 resize-y"
                      value={reviewText}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue.length <= 4000) {
                          setReviewText(nextValue);
                        }
                      }}
                      placeholder="Share what was good about the order"
                    />
                    <div className="mt-2 text-right text-xs text-zinc-500">{reviewText.length}/4000</div>
                  </div>

                  {reviewError ? (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-200">
                      {reviewError}
                    </div>
                  ) : null}

                  <button className="btn btn-primary w-full" type="submit" disabled={reviewSubmitting}>
                    {reviewSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending review...
                      </>
                    ) : (
                      "Submit review"
                    )}
                  </button>
                </form>
              </section>
            ) : null}
          </div>
        </div>
          </>
        )}
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthChanged={refreshAuth} />
    </main>
  );
}
