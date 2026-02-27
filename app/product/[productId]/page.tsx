"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiHttpError, asErrorMessage, getProductCard } from "@/lib/api";
import type { ProductCard as ProductCardType } from "@/lib/types";

type PageProps = {
  params: Promise<{ productId: string }>;
};

function formatPrice(price: string, currency: string): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return `${price} ${currency}`;

  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default function ProductPage({ params }: PageProps) {
  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductCardType | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

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
            setError("Товар не найден");
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
          setError("Товар не найден");
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
  const prices = useMemo(() => product?.prices ?? [], [product]);

  return (
    <main className="min-h-screen pb-16">
      <section className="mx-auto max-w-7xl px-4 mt-8">
        <div className="mb-5">
          <Link href="/" className="btn">
            Back to marketplace
          </Link>
        </div>

        {loading ? (
          <div className="card p-10 grid place-items-center">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading product...
            </div>
          </div>
        ) : error ? (
          <div className="card p-6 border-red-500/25 bg-red-500/5">
            <div className="text-sm font-medium text-red-700">Ошибка</div>
            <div className="text-sm text-red-700/80 mt-2">{error}</div>
          </div>
        ) : product ? (
          <div className="card p-5 md:p-6">
            <div className="grid gap-6 md:grid-cols-[1.1fr,1fr]">
              <div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {activeImage ? (
                    <Image
                      src={activeImage}
                      alt={product.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-sm text-[var(--muted)]">
                      Нет изображения
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
                          className={`relative aspect-square overflow-hidden rounded-lg border ${
                            isActive
                              ? "border-pink-400/70 ring-1 ring-pink-300/40"
                              : "border-white/10"
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

              <div>
                <h1 className="text-2xl font-semibold leading-tight">{product.name}</h1>
                <p className="mt-3 text-sm text-zinc-200/90 whitespace-pre-wrap">{product.description}</p>

                <div className="mt-5 text-sm text-zinc-300">Seller: {product.seller}</div>

                <div className="mt-5">
                  <div className="text-sm font-medium">Prices</div>
                  {prices.length === 0 ? (
                    <div className="mt-2 text-sm text-[var(--muted)]">Цена уточняется</div>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                      {prices.map((price) => (
                        <li key={`${price.currency}-${price.price}`}>
                          {price.currency}: {formatPrice(price.price, price.currency)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <div className="text-sm text-zinc-300">Товар не найден</div>
            {resolvedId ? <div className="mt-2 text-xs text-zinc-500">ID: {resolvedId}</div> : null}
          </div>
        )}
      </section>
    </main>
  );
}
