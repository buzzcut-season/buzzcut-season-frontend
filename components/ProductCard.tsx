import Image from "next/image";
import type { ProductFeedItem } from "@/lib/types";

function formatMoney(
  amount: number | null | undefined,
  precision: number | null | undefined,
  currency: string | null | undefined
) {
  if (amount == null || precision == null || !currency) return "—";
  const divider = Math.pow(10, precision);
  const value = divider ? amount / divider : amount;
  const maxFractionDigits = Math.max(0, Math.min(precision, 8));
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: maxFractionDigits,
    }).format(value);
  } catch {
    return `${value.toFixed(maxFractionDigits)} ${currency}`;
  }
}

export function ProductCard({
  item,
  currency,
}: {
  item: ProductFeedItem;
  currency: string;
}) {
  const prices = item.prices ?? [];
  const selected =
    prices.find((price) => price.currency === currency) ??
    prices.find((price) => price.currency === item.baseCurrency) ??
    prices[0];

  return (
    <div className="card overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0a10]">
        {item.image ? (
          <>
            <div
              className="absolute inset-0 scale-[1.15] blur-xl opacity-50"
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                WebkitMaskImage:
                  "radial-gradient(85% 85% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "radial-gradient(85% 85% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
              }}
              aria-hidden
            />

            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 90% at 50% 50%, rgba(11,10,16,0) 0%, rgba(11,10,16,0.55) 70%, rgba(11,10,16,0.95) 100%)",
              }}
              aria-hidden
            />

            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-contain scale-[1.01] transition-transform duration-500 group-hover:scale-[1.03]"
              style={{
                WebkitMaskImage:
                  "radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0) 100%)",
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[var(--muted)] text-sm">
            no image
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="font-semibold leading-snug line-clamp-2">
          {item.name}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-[var(--ink)] font-semibold">
            {formatMoney(selected?.amount, selected?.precision, selected?.currency)}
          </div>
          <button className="btn btn-primary">Купить</button>
        </div>
      </div>
    </div>
  );
}
