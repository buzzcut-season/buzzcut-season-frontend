import Image from "next/image";
import type { ProductFeedItem } from "@/lib/types";

function formatMoney(subunits: number, currency: string) {
  const amount = subunits / 100;
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function ProductCard({
  item,
  currency,
}: {
  item: ProductFeedItem;
  currency: string;
}) {
  const priceSubunits = item.prices?.[currency] ?? item.priceSubunits;
  const priceCurrency = item.prices?.[currency] ? currency : item.currency;

  return (
    <div className="card overflow-hidden group">
      <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
        {item.image ? (
          <>
            <div
              className="absolute inset-0 scale-[1.25] blur-2xl opacity-80"
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-hidden
            />
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{
                WebkitMaskImage:
                  "radial-gradient(80% 80% at 50% 50%, #000 70%, transparent 100%)",
                maskImage: "radial-gradient(80% 80% at 50% 50%, #000 70%, transparent 100%)",
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
        <div className="font-semibold leading-snug line-clamp-2">{item.name}</div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-[var(--ink)] font-semibold">
            {formatMoney(priceSubunits, priceCurrency)}
          </div>
          <button className="btn btn-primary">
            Купить
          </button>
        </div>
      </div>
    </div>
  );
}
