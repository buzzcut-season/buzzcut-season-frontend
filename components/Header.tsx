"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, User } from "lucide-react";
import { ApiHttpError, asErrorMessage, createSeller, getAccountMe, getSellerMe } from "@/lib/api";
import { clearAuth } from "@/lib/storage";
import type { AccountMe, SellerMe } from "@/lib/types";

const CURRENCIES = ["RUB", "USD", "EUR"] as const;

export function Header({
  onOpenAuth,
  onAuthChanged,
  isAuthed,
  currency,
  onCurrencyChange,
}: {
  onOpenAuth: () => void;
  onAuthChanged: () => void;
  isAuthed: boolean;
  currency: (typeof CURRENCIES)[number];
  onCurrencyChange: (next: (typeof CURRENCIES)[number]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sellerBusy, setSellerBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [seller, setSeller] = useState<SellerMe | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!isAuthed) {
      setProfileLoading(false);
      setProfileError(null);
      setAccount(null);
      setSeller(null);
      return;
    }

    let cancelled = false;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        try {
          const accountMe = await getAccountMe();
          if (cancelled) return;
          setAccount(accountMe);
        } catch (e) {
          if (cancelled) return;
          if (e instanceof ApiHttpError && (e.status === 401 || e.status === 403)) {
            onAuthChanged();
            return;
          }
          setProfileError(asErrorMessage(e));
        }

        try {
          const sellerMe = await getSellerMe();
          if (cancelled) return;
          setSeller(sellerMe);
        } catch (e) {
          if (cancelled) return;
          if (e instanceof ApiHttpError && e.status === 404) {
            setSeller(null);
            return;
          }
          if (e instanceof ApiHttpError && (e.status === 401 || e.status === 403)) {
            onAuthChanged();
            return;
          }
          setProfileError(asErrorMessage(e));
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, onAuthChanged]);

  function logout() {
    clearAuth();
    setProfileError(null);
    setAccount(null);
    setSeller(null);
    onAuthChanged();
    setMenuOpen(false);
  }

  async function becomeSeller() {
    if (sellerBusy) return;
    if (seller) {
      window.alert(`Seller already exists: ${seller.name}`);
      return;
    }
    const name = window.prompt("Seller name");
    if (name === null) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      window.alert("Seller name is required.");
      return;
    }
    setSellerBusy(true);
    try {
      await createSeller({ name: trimmedName });
      try {
        const sellerMe = await getSellerMe();
        setSeller(sellerMe);
      } catch {
        setSeller(null);
      }
      setMenuOpen(false);
      window.alert("You are now a seller.");
    } catch (e) {
      window.alert(asErrorMessage(e));
    } finally {
      setSellerBusy(false);
    }
  }

  return (
    <header className="mx-auto max-w-7xl px-4 pt-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="inline-block text-3xl font-semibold tracking-tight">
            Buzzcut Season <span className="text-pink-400">Marketplace</span>
          </Link>
          <div className="text-sm text-[var(--muted)] mt-1">
            Marketplace for the chosen, by ancient right
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="btn">
            Home
          </Link>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_20px_rgba(0,0,0,0.35)]">
            {CURRENCIES.map((code) => {
              const active = currency === code;
              return (
                <button
                  key={code}
                  className={
                    active
                      ? "rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-pink-500/50 to-violet-500/50 shadow-[0_6px_16px_rgba(236,72,153,0.25)] transition"
                      : "rounded-full px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition"
                  }
                  onClick={() => onCurrencyChange(code)}
                  aria-pressed={active}
                >
                  {code}
                </button>
              );
            })}
          </div>

          {!isAuthed ? (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                className="btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <User className="h-4 w-4" />
                Account
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-black/10 bg-white/95 text-zinc-900 shadow-[0_16px_30px_rgba(31,26,22,0.12)] p-2 text-sm z-50"
                  role="menu"
                >
                  {account && (
                    <div className="px-3 py-2 text-xs text-zinc-600 break-all">
                      {account.email}
                    </div>
                  )}
                  {seller && (
                    <div className="px-3 py-2 text-xs text-zinc-600">
                      Seller: {seller.name}
                    </div>
                  )}
                  {profileError && (
                    <div className="px-3 py-2 text-xs text-red-600">
                      {profileError}
                    </div>
                  )}
                  <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5" role="menuitem">
                    Profile
                  </button>
                  <Link
                    href="/orders"
                    className="block w-full rounded-xl px-3 py-2 text-left hover:bg-black/5"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Orders
                  </Link>
                  <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5" role="menuitem">
                    Favorites
                  </button>
                  <Link
                    href="/seller"
                    className="block w-full rounded-xl px-3 py-2 text-left hover:bg-black/5"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Seller studio
                  </Link>
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5 disabled:opacity-60 disabled:cursor-not-allowed"
                    role="menuitem"
                    onClick={becomeSeller}
                    disabled={sellerBusy || profileLoading || !!seller}
                  >
                    {seller ? "Seller already created" : sellerBusy ? "Creating seller..." : "Become a seller"}
                  </button>
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left text-pink-600 hover:bg-pink-500/10"
                    role="menuitem"
                    onClick={logout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
