"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, Star } from "lucide-react";
import { asErrorMessage, getProductReviews } from "@/lib/api";
import type { ProductReviewsSummary, Review } from "@/lib/types";
import { RatingStars } from "@/components/RatingStars";

function formatReviewDate(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function ProductReviewsSection({
  productId,
  summary,
}: {
  productId: number;
  summary: ProductReviewsSummary;
}) {
  const [items, setItems] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<string | null>(summary.averageRating);
  const [totalCount, setTotalCount] = useState(summary.totalCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProductReviews(productId, { page: 0, size: 20 });
      setItems(response.items ?? []);
      setAverageRating(response.averageRating);
      setTotalCount(response.totalCount);
    } catch (err) {
      setError(asErrorMessage(err));
      setItems([]);
      setAverageRating(summary.averageRating);
      setTotalCount(summary.totalCount);
    } finally {
      setLoading(false);
    }
  }, [productId, summary.averageRating, summary.totalCount]);

  useEffect(() => {
    setAverageRating(summary.averageRating);
    setTotalCount(summary.totalCount);
  }, [summary.averageRating, summary.totalCount]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  return (
    <section className="card overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/30 to-transparent" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-pink-300" />
            <h2 className="text-lg font-semibold">Product reviews</h2>
          </div>
          <p className="mt-2 text-sm text-zinc-400">Latest reviews are shown from newest to oldest.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          {averageRating == null ? (
            <div className="text-sm text-zinc-300">Пока нет отзывов</div>
          ) : (
            <>
              <div className="flex items-center justify-end gap-2">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                <span className="text-2xl font-semibold text-zinc-50">{averageRating}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400">{totalCount} review{totalCount === 1 ? "" : "s"}</div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reviews...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-200">
          Не удалось выполнить действие
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/15 p-5 text-sm text-zinc-300">
          Пока нет отзывов
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((review) => (
            <article key={review.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-zinc-100">{review.buyer}</div>
                  <div className="mt-1">
                    <RatingStars rating={review.rating} size="sm" />
                  </div>
                </div>
                <div className="text-xs text-zinc-400">{formatReviewDate(review.createdAt)}</div>
              </div>
              {review.text ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200/90">
                  {review.text}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
