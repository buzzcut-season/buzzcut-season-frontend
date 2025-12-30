"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, Radar } from "lucide-react";
import { getHealth } from "@/lib/api";
import { clearAuth, readAuth } from "@/lib/storage";

export function Header({
  onOpenAuth,
  onAuthChanged,
}: {
  onOpenAuth: () => void;
  onAuthChanged: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!readAuth()?.accessToken);
  }, []);

  function logout() {
    clearAuth();
    onAuthChanged();
  }

  return (
    <header className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            Buzzcut Season <span className="text-pink-300">Marketplace</span>
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            Ты солнышко
          </div>
        </div>
      </div>
    </header>
  );
}
