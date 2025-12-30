"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

export type ToastKind = "success" | "error" | "info";

export function Toast({
  open,
  kind = "info",
  message,
  onClose,
  autoHideMs = 3500,
}: {
  open: boolean;
  kind?: ToastKind;
  message: string;
  onClose: () => void;
  autoHideMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, autoHideMs);
    return () => window.clearTimeout(id);
  }, [open, onClose, autoHideMs]);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
      <div
        className={clsx(
          "card px-4 py-3 flex items-start gap-3",
          kind === "success" && "border-emerald-500/30",
          kind === "error" && "border-red-500/30",
          kind === "info" && "border-violet-500/30"
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex-1 text-sm text-zinc-100">{message}</div>
        <button className="btn h-8 w-8 p-0" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
