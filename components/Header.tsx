"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, User } from "lucide-react";
import { clearAuth } from "@/lib/storage";

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

  function logout() {
    clearAuth();
    onAuthChanged();
    setMenuOpen(false);
  }

  return (
    <header className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            Buzzcut Season <span className="text-pink-400">Marketplace</span>
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            Маркетплейс для избранных
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
              Войти
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
                Аккаунт
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-black/10 bg-white/95 text-zinc-900 shadow-[0_16px_30px_rgba(31,26,22,0.12)] p-2 text-sm z-50"
                  role="menu"
                >
                  <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5" role="menuitem">
                    Профиль
                  </button>
                  <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5" role="menuitem">
                    Заказы
                  </button>
                  <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5" role="menuitem">
                    Избранное
                  </button>
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left text-pink-600 hover:bg-pink-500/10"
                    role="menuitem"
                    onClick={logout}
                  >
                    Выйти
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
