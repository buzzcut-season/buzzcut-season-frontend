"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import { asErrorMessage, getSellerOrders } from "@/lib/api";
import { readAuth } from "@/lib/storage";
import type { OrderResponse } from "@/lib/types";

function formatOrderAmount(amount: number, currency: string, precision: number): string {
  if (!Number.isFinite(amount)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(amount);
  } catch {
    return `${amount.toFixed(precision)} ${currency}`;
  }
}

function getOrderTitle(order: OrderResponse): string {
  const title = order.displaySettings.productName?.trim();
  if (title) return title;
  return `#${order.orderId}`;
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("USD");
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSellerOrders();
      setOrders(response.orders ?? []);
    } catch (e) {
      setError(asErrorMessage(e));
      setOrders([]);
    } finally {
      setLoading(false);
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
      setOrders([]);
      setError(null);
      setLoading(false);
      return;
    }
    void loadOrders();
  }, [isAuthed, loadOrders]);

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <section className="mx-auto max-w-4xl px-4 mt-8 space-y-4">
        <div className="text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-200 transition">Marketplace</Link> /{" "}
          <Link href="/seller" className="hover:text-zinc-200 transition">Seller</Link> / Orders
        </div>

        {!isAuthed ? (
          <div className="card p-6 space-y-3">
            <div className="text-lg font-semibold">Seller Orders</div>
            <div className="text-sm text-zinc-300">Sign in with a SELLER account to view your orders.</div>
            <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          </div>
        ) : (
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Seller Orders</div>
              <button className="btn" type="button" onClick={() => void loadOrders()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-zinc-300">Loading orders...</div>
            ) : error ? (
              <div className="text-sm text-red-300">{error}</div>
            ) : orders.length === 0 ? (
              <div className="text-sm text-zinc-400">No orders yet</div>
            ) : (
              <div className="grid gap-3">
                {orders.map((order) => (
                  <button
                    key={order.orderId}
                    type="button"
                    className="rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-white/25 transition"
                    onClick={() => router.push(`/seller/orders/${order.orderId}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-zinc-100">{getOrderTitle(order)}</div>
                        <div className="text-xs text-zinc-400">
                          Order #{order.orderId} · {order.status}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {formatOrderAmount(order.amount, order.currency, order.precision)}
                        </div>
                      </div>
                      {order.displaySettings.coverImage ? (
                        <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-white/10">
                          <Image
                            src={order.displaySettings.coverImage}
                            alt={getOrderTitle(order)}
                            fill
                            unoptimized
                            sizes="96px"
                            className="object-contain p-1"
                          />
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthChanged={refreshAuth} />
    </main>
  );
}
