"use client";

import { Star } from "lucide-react";
import clsx from "clsx";

export function RatingStars({
  rating,
  size = "md",
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (nextRating: number) => void;
}) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]";

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const active = value <= rating;

        if (!interactive) {
          return (
            <Star
              key={value}
              className={clsx(iconSize, active ? "fill-amber-300 text-amber-300" : "text-zinc-600")}
            />
          );
        }

        return (
          <button
            key={value}
            type="button"
            className="rounded-md p-0.5 transition hover:scale-105"
            onClick={() => onChange?.(value)}
            aria-label={`Set rating to ${value}`}
          >
            <Star
              className={clsx(iconSize, active ? "fill-amber-300 text-amber-300" : "text-zinc-500 hover:text-zinc-300")}
            />
          </button>
        );
      })}
    </div>
  );
}
